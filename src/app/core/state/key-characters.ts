import { KeyCharacter } from '../data/key-characters';
import { KnownTeam } from '../data/known-meta';
import { CharacterPotential, RosterEntry, TeamTab } from '../models';
import { DevStatus, MemberPower, memberPower } from './potential-calc';
import { nameKey } from './teams-calc';

export interface KeyCharacterRow {
  key: KeyCharacter;
  /** Resolved roster entry; undefined when the name is not in the game data. */
  entry?: RosterEntry;
  /** Known-meta lineups that list this character (any slot option). */
  teams: string[];
  modes: TeamTab[];
  power?: MemberPower;
  status: DevStatus | 'unknown';
  /** Higher = farm sooner. 0 when done or unknown. */
  priority: number;
}

/** Resolves key characters and ranks those still worth investing in. */
export function keyCharacterRows(
  keys: KeyCharacter[],
  known: KnownTeam[],
  roster: RosterEntry[],
  potentialOf: (entry: RosterEntry) => CharacterPotential | undefined,
): KeyCharacterRow[] {
  const byName = new Map(roster.map((e) => [nameKey(e.name), e]));

  const rows = keys.map((key): KeyCharacterRow => {
    const names = key.name.split('|').map((n) => nameKey(n.trim()));
    const entry = names.map((n) => byName.get(n)).find((e) => !!e);
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
    return {
      key,
      entry,
      teams,
      modes,
      power,
      status,
      priority: priorityOf(status, teams, modes, power),
    };
  });

  return rows.sort((a, b) => b.priority - a.priority || a.key.name.localeCompare(b.key.name));
}

/**
 * Usefulness (teams listing it + modes it serves) weighted by how much work is left:
 * locked characters get a bonus, developing ones scale with the missing share of power.
 */
function priorityOf(
  status: KeyCharacterRow['status'],
  teams: string[],
  modes: TeamTab[],
  power: MemberPower | undefined,
): number {
  if (status === 'unknown' || status === 'maxed' || status === 'optimal') return 0;
  const usefulness = teams.length * 2 + modes.length;
  const work = status === 'locked' ? 1.5 : 1 + (1 - (power?.share ?? 0));
  return Math.round(usefulness * work * 10) / 10;
}
