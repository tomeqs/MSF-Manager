import {
  CharacterInfo,
  CharacterInstance,
  Iso8,
  IsoClass,
  itemId,
  RosterEntry,
  Trait,
  TraitObject,
} from '../models';

const NO_SLOTS = [false, false, false, false, false, false];

export function normalizeTrait(trait: Trait): TraitObject {
  return typeof trait === 'string'
    ? { id: trait, name: trait }
    : { ...trait, name: trait.name ?? trait.id };
}

function isoSummary(iso8: CharacterInstance['iso8']): RosterEntry['iso'] {
  // CSV form (statsFormat=csv) is not requested by the app.
  if (!iso8 || typeof iso8 === 'string') return { level: 0 };
  const active = iso8.active;
  return {
    active,
    matrix: iso8.matrix,
    level: active ? ((iso8[active as keyof Iso8] as number) ?? 0) : 0,
  };
}

/**
 * Joins game data (CharacterInfo) with the player's instance into a flat RosterEntry.
 * A missing instance or one without `level` means the character is locked.
 */
export function toRosterEntry(info: CharacterInfo, instance?: CharacterInstance): RosterEntry {
  const unlocked = instance?.level !== undefined;
  const red = instance?.activeRed ?? 0;
  return {
    id: info.id,
    name: info.name ?? info.id,
    portrait: info.portrait,
    traits: (info.traits ?? []).map(normalizeTrait),
    unlocked,
    favorite: instance?.favorite ?? false,
    level: instance?.level ?? 0,
    yellowStars: instance?.activeYellow ?? 0,
    redStars: Math.min(red, 7),
    diamonds: Math.max(red - 7, 0),
    gearTier: instance?.gearTier ?? 0,
    gearSlots: instance?.gearSlots ?? NO_SLOTS,
    abilities: {
      basic: instance?.basic ?? 0,
      special: instance?.special ?? 0,
      ultimate: instance?.ultimate ?? 0,
      passive: instance?.passive ?? 0,
    },
    iso: isoSummary(instance?.iso8),
    power: instance?.power ?? 0,
    shardItemId: itemId(info.starItems?.[0]),
  };
}

export function buildRoster(
  characters: CharacterInfo[],
  roster: CharacterInstance[],
): RosterEntry[] {
  const byId = new Map(roster.map((i) => [i.id, i]));
  return characters.map((info) => toRosterEntry(info, byId.get(info.id)));
}

export const ISO_CLASS_LABELS: Record<IsoClass, string> = {
  striker: 'Striker',
  fortifier: 'Fortifier',
  healer: 'Healer',
  skirmisher: 'Skirmisher',
  raider: 'Raider',
};
