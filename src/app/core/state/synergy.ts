import { AbilityKey, CharacterKit, RosterEntry } from '../models';

/**
 * Synergies read from the ability kits: a kit that boosts "Symbiote allies" links its owner
 * to every Symbiote, and one that names a character ("when Toxin is an ally") links the two.
 * Rare traits weigh more than common ones (Hero, Mutant…), mentions of enemies do not count,
 * and two characters sharing a rare (team) trait get a small bonus even without a mention.
 */
export interface SynergyLink {
  /** Whose kit makes the link (for `shared`, either). */
  from: string;
  to: string;
  /** The trait or character name the kit mentions (or the shared trait). */
  via: string;
  kind: 'trait' | 'name' | 'shared';
  ability?: AbilityKey;
  weight: number;
}

export interface SynergyIndex {
  /** False when no kits were available — only shared traits count then. */
  fromKits: boolean;
  /** Symmetric score of a pair; 0 = nothing in common. */
  pair(a: string, b: string): number;
  /** Why a and b fit, strongest first. */
  links(a: string, b: string): SynergyLink[];
  /** The kit refers to neighbours ("adjacent"), so the squad order matters. */
  positional(id: string): boolean;
}

/** Passives carry most team synergy; the other abilities still count. */
const ABILITY_WEIGHT: Record<AbilityKey, number> = {
  passive: 1,
  ultimate: 0.6,
  special: 0.6,
  basic: 0.4,
};
/** Kit mentions of traits less rare than this (Hero, Villain…) are ignored. */
const MIN_RARITY = 0.2;
/** Shared traits count from this rarity (team traits, not origins or roles). */
const SHARED_MIN_RARITY = 0.4;
const SHARED_WEIGHT = 0.5;
/** A kit naming a character is the most explicit synergy there is. */
const NAME_WEIGHT = 1.5;
/** Short names ("Ant") would match ordinary words. */
const MIN_NAME_LENGTH = 4;
/** Words after a mention that decide whether it is about allies or enemies. */
const CONTEXT_WORDS = 3;
const ALLY_WORDS = new Set(['ally', 'allies', 'allied', 'teammate', 'teammates', 'squad']);
const ENEMY_WORDS = new Set(['enemy', 'enemies', 'opponent', 'opponents', 'target', 'targets']);
const ABILITIES: AbilityKey[] = ['passive', 'ultimate', 'special', 'basic'];

interface Mention {
  weight: number;
  ability: AbilityKey;
  via: string;
}

export function buildSynergy(roster: RosterEntry[], kits: CharacterKit[]): SynergyIndex {
  const total = Math.max(2, roster.length);
  const traitsOf = new Map(roster.map((e) => [e.id, new Set(e.traits.map((t) => t.id))]));
  const count = new Map<string, number>();
  for (const traits of traitsOf.values()) {
    for (const t of traits) count.set(t, (count.get(t) ?? 0) + 1);
  }
  const rarity = (trait: string) => {
    const n = count.get(trait) ?? 0;
    return n ? Math.log(total / n) / Math.log(total) : 0;
  };

  // Names in the language of the kit texts, falling back to the roster's.
  const traitNames = new Map<string, string>();
  for (const e of roster) for (const t of e.traits) traitNames.set(t.id, t.name ?? t.id);
  for (const k of kits) for (const t of k.traits) if (t.name) traitNames.set(t.id, t.name);
  const charNames = new Map(roster.map((e) => [e.id, e.name]));
  for (const k of kits) if (k.name && charNames.has(k.id)) charNames.set(k.id, k.name);

  const names = [...charNames.entries()]
    .map(([id, name]) => ({ id, name, tokens: tokens(name) }))
    .filter((n) => n.tokens.join('').length >= MIN_NAME_LENGTH)
    .sort((a, b) => b.tokens.length - a.tokens.length || b.name.length - a.name.length);
  const traits = [...traitNames.entries()]
    .filter(([id]) => rarity(id) >= MIN_RARITY)
    .map(([id, name]) => ({ id, name, tokens: tokens(name) }))
    .filter((t) => t.tokens.length > 0)
    .sort((a, b) => b.tokens.length - a.tokens.length);

  const traitMentions = new Map<string, Map<string, Mention>>();
  const nameMentions = new Map<string, Map<string, Mention>>();
  const positional = new Set<string>();
  for (const kit of kits) {
    if (!traitsOf.has(kit.id)) continue;
    const byTrait = new Map<string, Mention>();
    const byName = new Map<string, Mention>();
    for (const ability of ABILITIES) {
      const text = kit.texts[ability];
      if (!text) continue;
      const words = tokens(text);
      if (words.includes('adjacent')) positional.add(kit.id);
      const used = new Array<boolean>(words.length).fill(false);
      for (const n of names) {
        if (n.id === kit.id) continue;
        // A named character is an ally unless the text says enemy.
        const context = scan(words, n.tokens, used);
        if (context !== undefined && context > 0) {
          keep(byName, n.id, { weight: 1, ability, via: n.name });
        }
      }
      for (const t of traits) {
        const context = scan(words, t.tokens, used);
        if (context !== undefined && context > 0) {
          keep(byTrait, t.id, { weight: context * ABILITY_WEIGHT[ability], ability, via: t.name });
        }
      }
    }
    traitMentions.set(kit.id, byTrait);
    nameMentions.set(kit.id, byName);
  }

  const directed = (from: string, to: string): SynergyLink[] => {
    const result: SynergyLink[] = [];
    const toTraits = traitsOf.get(to);
    for (const [trait, m] of traitMentions.get(from) ?? []) {
      if (toTraits?.has(trait)) {
        result.push({
          from,
          to,
          via: m.via,
          kind: 'trait',
          ability: m.ability,
          weight: m.weight * rarity(trait),
        });
      }
    }
    const named = nameMentions.get(from)?.get(to);
    if (named) {
      result.push({
        from,
        to,
        via: named.via,
        kind: 'name',
        ability: named.ability,
        weight: named.weight * NAME_WEIGHT * ABILITY_WEIGHT[named.ability],
      });
    }
    return result;
  };

  const memo = new Map<string, SynergyLink[]>();
  const links = (a: string, b: string): SynergyLink[] => {
    if (a === b) return [];
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    let result = memo.get(key);
    if (!result) {
      result = [...directed(a, b), ...directed(b, a)];
      let shared: SynergyLink | undefined;
      const bTraits = traitsOf.get(b);
      for (const t of traitsOf.get(a) ?? []) {
        const r = rarity(t);
        if (r < SHARED_MIN_RARITY || !bTraits?.has(t)) continue;
        if (!shared || r * SHARED_WEIGHT > shared.weight) {
          shared = {
            from: a,
            to: b,
            via: traitNames.get(t) ?? t,
            kind: 'shared',
            weight: r * SHARED_WEIGHT,
          };
        }
      }
      if (shared) result.push(shared);
      result.sort((x, y) => y.weight - x.weight);
      memo.set(key, result);
    }
    return result;
  };

  return {
    fromKits: kits.some((k) => Object.keys(k.texts).length > 0),
    pair: (a, b) => links(a, b).reduce((sum, l) => sum + l.weight, 0),
    links,
    positional: (id) => positional.has(id),
  };
}

/** Mean pair score of a squad mapped to 0–1 (≈0.6 for a typical trait team). */
export function cohesion(ids: string[], synergy: SynergyIndex): number {
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      sum += synergy.pair(ids[i], ids[j]);
      pairs++;
    }
  }
  const mean = pairs ? sum / pairs : 0;
  return mean / (mean + COHESION_HALF);
}

/** Mean pair score at which cohesion is 50%. */
const COHESION_HALF = 0.6;

/** What `member` adds to the others in the squad. */
export function contribution(member: string, others: string[], synergy: SynergyIndex): number {
  return others.reduce((sum, o) => (o === member ? sum : sum + synergy.pair(member, o)), 0);
}

/** The strongest links inside a squad (one per pair), best first. */
export function squadLinks(ids: string[], synergy: SynergyIndex, limit = 3): SynergyLink[] {
  const best: SynergyLink[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const top = synergy.links(ids[i], ids[j])[0];
      if (top) best.push(top);
    }
  }
  return best.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

/** Lowercase words with markup and punctuation removed ("Spider-Verse" → spider, verse). */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * Finds `needle` in `words` (last word may take a plural "s"), skipping words already used by
 * a longer name. Returns the strongest context weight found (1 = about allies, 0.5 = unclear,
 * 0 = about enemies or "non-…"), or undefined when it does not occur.
 */
function scan(words: string[], needle: string[], used: boolean[]): number | undefined {
  let best: number | undefined;
  const last = needle.length - 1;
  for (let i = 0; i + needle.length <= words.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length && match; j++) {
      const word = words[i + j];
      match =
        !used[i + j] &&
        (word === needle[j] ||
          (j === last && (word === `${needle[j]}s` || `${word}s` === needle[j])));
    }
    if (!match) continue;
    for (let j = 0; j < needle.length; j++) used[i + j] = true;
    const weight =
      words[i - 1] === 'non'
        ? 0
        : contextWeight(words.slice(i + needle.length, i + needle.length + CONTEXT_WORDS));
    best = Math.max(best ?? 0, weight);
  }
  return best;
}

function contextWeight(after: string[]): number {
  for (const word of after) {
    if (ENEMY_WORDS.has(word)) return 0;
    if (ALLY_WORDS.has(word)) return 1;
  }
  return 0.5;
}

function keep(map: Map<string, Mention>, id: string, mention: Mention): void {
  const current = map.get(id);
  if (!current || mention.weight > current.weight) map.set(id, mention);
}
