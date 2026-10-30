import { CharacterKit, RosterEntry } from '../models';
import { tokens } from './synergy';

/**
 * Mechanics a character brings, read from the words of its ability descriptions (as the game
 * names them: "Taunt", "Heal", "Ability Block"…). A mention is not proof the ability gives the
 * effect to allies (it may clear it from enemies), so this is a profile, not a guarantee.
 */
export type Capability =
  | 'taunt'
  | 'barrier'
  | 'deathproof'
  | 'heal'
  | 'revive'
  | 'cleanse'
  | 'stun'
  | 'abilityBlock'
  | 'speedBar'
  | 'assist'
  | 'counter'
  | 'stealth'
  | 'flip'
  | 'defenseDown'
  | 'bleed'
  | 'aoe';

export type CapabilityGroup = 'protect' | 'sustain' | 'cleanse' | 'control' | 'damage';

interface CapabilityDef {
  id: Capability;
  label: string;
  group: CapabilityGroup;
  /** Word sequences (lowercase) that name it. */
  phrases: string[][];
}

export const CAPABILITIES: CapabilityDef[] = [
  { id: 'taunt', label: 'Taunt', group: 'protect', phrases: [['taunt']] },
  { id: 'barrier', label: 'Barrier', group: 'protect', phrases: [['barrier']] },
  { id: 'deathproof', label: 'Deathproof', group: 'protect', phrases: [['deathproof']] },
  {
    id: 'heal',
    label: 'Leczenie',
    group: 'sustain',
    phrases: [['heal'], ['heals'], ['healing'], ['regeneration']],
  },
  { id: 'revive', label: 'Odradzanie', group: 'sustain', phrases: [['revive'], ['revives']] },
  { id: 'cleanse', label: 'Cleanse', group: 'cleanse', phrases: [['cleanse'], ['cleanses']] },
  { id: 'stun', label: 'Stun', group: 'control', phrases: [['stun']] },
  { id: 'abilityBlock', label: 'Ability Block', group: 'control', phrases: [['ability', 'block']] },
  { id: 'speedBar', label: 'Speed Bar', group: 'control', phrases: [['speed', 'bar']] },
  { id: 'flip', label: 'Flip', group: 'control', phrases: [['flip']] },
  { id: 'assist', label: 'Assist', group: 'damage', phrases: [['assist']] },
  { id: 'counter', label: 'Counter', group: 'damage', phrases: [['counter'], ['counterattack']] },
  { id: 'stealth', label: 'Stealth', group: 'control', phrases: [['stealth']] },
  { id: 'defenseDown', label: 'Defense Down', group: 'damage', phrases: [['defense', 'down']] },
  { id: 'bleed', label: 'Bleed', group: 'damage', phrases: [['bleed']] },
  { id: 'aoe', label: 'Atak obszarowy', group: 'damage', phrases: [['all', 'enemies']] },
];

export const GROUP_LABELS: Record<CapabilityGroup, string> = {
  protect: 'ochrona',
  sustain: 'leczenie / odradzanie',
  cleanse: 'oczyszczanie',
  control: 'kontrola i tempo',
  damage: 'obrażenia',
};

/** What a squad without it has no answer to (shown as a gap). */
export const ESSENTIAL_GROUPS: CapabilityGroup[] = ['protect', 'sustain', 'cleanse'];

const LABELS = new Map(CAPABILITIES.map((c) => [c.id, c]));

export function capabilityLabel(id: Capability): string {
  return LABELS.get(id)?.label ?? id;
}

/** Mechanics named in any of the kit's abilities, in `CAPABILITIES` order. */
export function capabilitiesOf(kit: CharacterKit | undefined): Capability[] {
  if (!kit) return [];
  const words = Object.values(kit.texts).flatMap((text) => [...tokens(text ?? ''), '|']);
  return CAPABILITIES.filter((c) => c.phrases.some((p) => contains(words, p))).map((c) => c.id);
}

export interface SquadProfile {
  /** Mechanics present, with who brings them. */
  present: { id: Capability; by: string[] }[];
  /** Essential groups nobody in the squad covers. */
  gaps: CapabilityGroup[];
}

export function squadProfile(
  members: RosterEntry[],
  kitOf: (id: string) => CharacterKit | undefined,
): SquadProfile {
  const by = new Map<Capability, string[]>();
  for (const m of members) {
    for (const c of capabilitiesOf(kitOf(m.id))) by.set(c, [...(by.get(c) ?? []), m.name]);
  }
  const present = CAPABILITIES.filter((c) => by.has(c.id)).map((c) => ({
    id: c.id,
    by: by.get(c.id)!,
  }));
  const groups = new Set(present.map((p) => LABELS.get(p.id)!.group));
  return { present, gaps: ESSENTIAL_GROUPS.filter((g) => !groups.has(g)) };
}

export interface Coverage {
  id: Capability;
  label: string;
  group: CapabilityGroup;
  /** Characters in the pool with it, strongest first. */
  characters: RosterEntry[];
}

/** How many of the pool's characters bring each mechanic (fewest first). */
export function rosterCoverage(
  pool: RosterEntry[],
  kitOf: (id: string) => CharacterKit | undefined,
): Coverage[] {
  const byCap = new Map<Capability, RosterEntry[]>();
  for (const e of [...pool].sort((a, b) => b.power - a.power)) {
    for (const c of capabilitiesOf(kitOf(e.id))) byCap.set(c, [...(byCap.get(c) ?? []), e]);
  }
  return CAPABILITIES.map((c) => ({
    id: c.id,
    label: c.label,
    group: c.group,
    characters: byCap.get(c.id) ?? [],
  })).sort((a, b) => a.characters.length - b.characters.length);
}

function contains(words: string[], phrase: string[]): boolean {
  outer: for (let i = 0; i + phrase.length <= words.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (words[i + j] !== phrase[j]) continue outer;
    return true;
  }
  return false;
}
