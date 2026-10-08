import { KeyCharacter } from '../data/key-characters';
import { KnownTeam } from '../data/known-meta';
import { CharacterPotential, RosterEntry, TeamTab } from '../models';
import { Recommendation } from './advisor';
import { DevStatus, MemberPower, memberPower } from './potential-calc';
import { nameKey, resolveName, rosterByName } from './teams-calc';

export interface KeyCharacterRow {
  key: KeyCharacter;
  /** Resolved roster entry; undefined when the name is not in the game data. */
  entry?: RosterEntry;
  /** Known-meta lineups that list this character (any slot option). */
  teams: string[];
  modes: TeamTab[];
  power?: MemberPower;
  status: DevStatus | 'unknown';
  /** Its place in the roster-wide ranking, when it is worth farming. */
  recommendation?: Recommendation;
}

/** Resolves key characters, ordered like the roster-wide ranking (not worth farming last). */
export function keyCharacterRows(
  keys: KeyCharacter[],
  known: KnownTeam[],
  roster: RosterEntry[],
  potentialOf: (entry: RosterEntry) => CharacterPotential | undefined,
  recommendations: ReadonlyMap<string, Recommendation>,
): KeyCharacterRow[] {
  const byName = rosterByName(roster);

  const rows = keys.map((key): KeyCharacterRow => {
    const names = key.name.split('|').map((n) => nameKey(n.trim()));
    const entry = resolveName(key.name, byName);
    const teams = known
      .filter((t) =>
        (t.members ?? []).some((slot) =>
          slot.split('|').some((option) => names.includes(nameKey(option.trim()))),
        ),
      )
      .map((t) => t.name);
    const modes = [
      ...new Set([
        ...key.modes,
        ...known.filter((t) => teams.includes(t.name)).flatMap((t) => t.modes),
      ]),
    ];
    const power = entry ? memberPower(entry, potentialOf(entry)) : undefined;
    const status: KeyCharacterRow['status'] = !entry
      ? 'unknown'
      : (power?.status ?? (entry.unlocked ? 'developing' : 'locked'));
    const recommendation =
      entry && status !== 'maxed' && status !== 'optimal'
        ? recommendations.get(entry.id)
        : undefined;
    return { key, entry, teams, modes, power, status, recommendation };
  });

  const rank = (r: KeyCharacterRow) => r.recommendation?.rank ?? Number.MAX_SAFE_INTEGER;
  return rows.sort((a, b) => rank(a) - rank(b) || a.key.name.localeCompare(b.key.name));
}
