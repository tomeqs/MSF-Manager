import { RosterEntry } from '../models';
import { SquadOption, buildAround, strongest, synergySquad } from './squads';
import { SynergyIndex } from './synergy';
import { TEAM_SIZE } from './teams-calc';

/** How the members of a proposal should be lined up in game, and why. */
export interface Arrangement {
  members: RosterEntry[];
  /** Whose order it is: most players', the player's own, the guide's, or worked out here. */
  basis: 'community' | 'saved' | 'meta' | 'kits';
  /** What the order is based on, for the player. */
  note: string;
}

export interface Proposal {
  option: SquadOption;
  arrangement: Arrangement;
}

export interface AssistantInput {
  /** Every option for the mode (`squadOptions`). */
  options: SquadOption[];
  roster: RosterEntry[];
  /** Characters already in saved squads — never proposed again. */
  taken: ReadonlySet<string>;
  /** Option keys the player asked to skip. */
  skipped: ReadonlySet<string>;
  synergy: SynergyIndex;
}

/**
 * The next squads to save for a mode, best first, built only from characters that are not
 * in a saved squad yet and never sharing one: known and popular squads the player can field,
 * then squads built from the kits around the strongest free characters. Skipped proposals are
 * left out (a skipped kit squad gives up its first pick as a seed).
 */
export function assistantProposals(input: AssistantInput, limit = 5): Proposal[] {
  const { options, roster, taken, skipped, synergy } = input;
  const used = new Set(taken);
  const proposals: SquadOption[] = [];
  for (const o of options) {
    if (proposals.length >= limit) break;
    if (o.missing.length || !o.members.length || skipped.has(o.key)) continue;
    if (o.origins.every((x) => x === 'saved')) continue;
    if (o.members.some((m) => used.has(m.id))) continue;
    proposals.push(o);
    for (const m of o.members) used.add(m.id);
  }
  const pool = strongest(roster.filter((e) => !used.has(e.id)));
  const seeds = [...pool];
  while (proposals.length < limit && seeds.length) {
    const seed = seeds.shift()!;
    if (used.has(seed.id)) continue;
    const members = buildAround(
      seed,
      pool.filter((e) => !used.has(e.id)),
      synergy,
    );
    // Too few free characters left for a full squad: they stay on the free list.
    if (members.length < TEAM_SIZE) break;
    const squad = synergySquad(members, synergy);
    if (skipped.has(squad.key)) continue;
    proposals.push(squad);
    for (const m of members) used.add(m.id);
  }
  return proposals.map((option) => ({ option, arrangement: arrange(option, synergy) }));
}

/**
 * Line-up for a squad. Most players' order wins when the squad is a popular one, then the
 * player's own and the guide's. Otherwise only kits that act on neighbours ("adjacent") make
 * the order matter: such a character goes in the middle with its best partners beside it.
 */
export function arrange(option: SquadOption, synergy: SynergyIndex): Arrangement {
  const members = option.members;
  if (option.order === 'community') {
    return { members, basis: 'community', note: 'Kolejność jak u większości graczy.' };
  }
  const positional = members.filter((m) => synergy.positional(m.id));
  if (!positional.length) {
    if (option.order === 'saved') {
      return { members, basis: 'saved', note: 'Twoja kolejność z gry.' };
    }
    return {
      members,
      basis: option.order === 'meta' ? 'meta' : 'kits',
      note: 'Nic w umiejętnościach tych postaci nie zależy od pozycji — ustaw dowolnie.',
    };
  }
  const center = positional[0];
  const rest = members
    .filter((m) => m !== center)
    .sort((a, b) => synergy.pair(center.id, b.id) - synergy.pair(center.id, a.id));
  // Middle slot for the neighbour-dependent kit, its two best partners right beside it.
  const lineup = [rest[2], rest[0], center, rest[1], rest[3]].filter((m): m is RosterEntry => !!m);
  const partners = [rest[0], rest[1]].filter((m) => !!m).map((m) => m.name);
  return {
    members: lineup,
    basis: 'kits',
    note:
      `${center.name} ma umiejętność działającą na sąsiadów — w środku` +
      (partners.length ? `, obok ${partners.join(' i ')}.` : '.'),
  };
}
