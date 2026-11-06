import { CharacterKit } from '../../models';
import { MOCK_CHARACTERS } from './mock-characters';
import { MOCK_ROSTER } from './mock-roster';

/**
 * Demo-only ability texts in the style of the game's kits — invented, not the real kits. They
 * mention traits and characters the way real passives do, so the synergy view has something
 * to read.
 */
const PASSIVES: Record<string, string> = {
  CaptainAmerica:
    'On Spawn, Avenger allies gain Defense Up. When an Avenger ally is attacked, gain Counter.',
  IronMan: 'Avenger allies gain +10% Damage. Flip 1 negative effect on each Tech ally.',
  Thor: 'Asgardian and Avenger allies gain +15% Max Health. Gain Speed Up when an ally is Stunned.',
  BlackWidow: 'Avenger allies gain +10% Focus. On death, grant Stealth to Captain America.',
  Hulk: 'Gain Offense Up below 50% Health. Gain +5% Damage for each Avenger ally.',
  SpiderMan:
    'Spider-Verse allies gain Evade on Spawn. When Spider-Man (Miles) is an ally, gain Speed Up.',
  MilesMorales: 'Spider-Verse allies gain +20% Damage against Villain enemies.',
  GhostSpider:
    'Spider-Verse allies gain Evade. Cleanse 1 negative effect from Spider-Verse allies.',
  Wolverine: 'X-Men allies gain Regeneration. Gain Defense Up while Storm is an ally.',
  Storm:
    'X-Men allies gain +10% Speed. Adjacent allies gain Offense Up. Apply Slow to Mystic enemies.',
  Cyclops: 'X-Men allies gain Offense Up on Spawn.',
  Phoenix:
    'X-Men allies are revived once per battle. Omega Red (Phoenix Force) and Magneto (Phoenix Force) gain Charged.',
  BlackPanther: 'Wakandan allies gain Counter. Gain Deflect for each Wakandan ally.',
  Shuri: 'Heal Wakandan allies for 10% of their Max Health. Black Panther gains Offense Up.',
  Okoye: 'Wakandan allies gain Defense Up and +10% Armor.',
  StarLord: 'Guardian allies gain Offense Up. Gain Speed Up when Rocket Raccoon is an ally.',
  Rocket: 'Guardian allies gain +10% Crit Chance. Groot gains Taunt on Spawn.',
  Groot: 'Guardian allies gain Regeneration and Deathproof.',
  Drax: 'Guardian allies gain +10% Damage.',
  Mantis: 'Heal Guardian allies. Apply Stun to Villain enemies.',
  Magneto: 'Mutant allies gain Deflect. Gain Defense Up for each Mutant ally.',
  Loki: 'Asgardian allies gain Stealth on Spawn. Apply Disrupted to Hero enemies.',
  Thanos: 'Gain Deathproof. Villain allies gain +5% Damage.',
  DoctorDoom: 'Villain allies gain Deflect.',
  ProfessorX: 'Mutant and X-Men allies gain Clarity. Fill the Speed Bar of all allies by 10%.',
  Knull: 'Symbiote allies gain Offense Up and +20% Damage.',
  Mephisto: 'Mystic allies gain Defense Up. Apply Trauma to Hero enemies.',
  Odin: 'Asgardian allies gain +20% Max Health and Deathproof. Thor gains Offense Up.',
  BlueMarvel: 'Gain Barrier. Hero allies gain +5% Damage.',
  QuicksilverSymbiote: 'Symbiote allies gain Speed Up. Riot and Toxin gain Offense Up on Spawn.',
  Riot: 'Symbiote allies gain +15% Damage. Gain Counter when Toxin is an ally.',
  Toxin: 'Heal Symbiote allies. When Phoenix is an ally, gain Deathproof.',
  BladeMighty:
    'Avenger allies gain Offense Up. Spider-Woman (Julia) and Rachel Cole-Alves gain Speed Up.',
  SpiderWomanJulia: 'Avenger allies gain Evade. Gain Speed Up when Blade (Mighty) is an ally.',
  RachelColeAlves: 'Avenger allies gain +10% Crit Chance against Mystic enemies.',
  OmegaRedPF: 'Mutant allies gain Offense Up. When Phoenix is an ally, gain Regeneration.',
  MagnetoPF: 'Mutant allies gain Deflect. When Phoenix is an ally, gain Charged.',
  Executioner: 'Asgardian allies gain Offense Up. When Loki is an ally, gain Counter.',
};

/** Demo-only specials/ultimates carrying the mechanics (Taunt, Heal, Cleanse…). */
const SPECIALS: Record<string, string> = {
  CaptainAmerica: 'Gain Taunt and Deflect. Apply Defense Up to all allies.',
  IronMan: 'Attack all enemies. Apply Ability Block to the primary target.',
  Thor: 'Attack all enemies and Stun the primary target. Gain 25% Speed Bar.',
  BlackWidow: 'Apply Blind and Ability Block. Gain Stealth.',
  Hulk: 'Gain Taunt. Counterattack when attacked.',
  SpiderMan: 'Apply Stun. Gain Evade.',
  MilesMorales: 'Gain Stealth and attack all enemies.',
  GhostSpider: 'Reduce Speed Bar of all enemies by 20%.',
  Wolverine: 'Gain Regeneration and Counter.',
  Storm: 'Attack all enemies. Fill the Speed Bar of all allies by 15%.',
  Cyclops: 'Attack the primary target and Call an ally to Assist.',
  Phoenix: 'Revive all fallen allies with 30% Health.',
  BlackPanther: 'Gain Deflect and Counter.',
  Shuri: 'Heal all allies and Cleanse 2 negative effects.',
  Okoye: 'Gain Taunt and Defense Up.',
  StarLord: 'Call an ally to Assist.',
  Rocket: 'Attack all enemies.',
  Groot: 'Gain Taunt. Heal all allies.',
  Drax: 'Attack the primary target. Apply Bleed.',
  Mantis: 'Heal all allies. Stun the primary target.',
  Magneto: 'Apply Barrier to all allies.',
  Loki: 'Flip 2 positive effects on all enemies into negative effects.',
  Thanos: 'Gain Deathproof and Taunt.',
  DoctorDoom: 'Apply Barrier to all allies and Ability Block to enemies.',
  ProfessorX: 'Cleanse all negative effects from all allies. Apply Stun to the target.',
  Knull: 'Attack all enemies. Apply Ability Block.',
  Mephisto: 'Revive a fallen ally. Apply Disrupted.',
  Odin: 'Apply Deathproof and Barrier to all allies.',
  BlueMarvel: 'Gain Barrier. Attack all enemies.',
  QuicksilverSymbiote: 'Gain Speed Up. Reduce the Speed Bar of the target by 30%.',
  Riot: 'Attack all enemies. Apply Bleed.',
  Toxin: 'Gain Taunt and Deathproof. Heal Symbiote allies.',
  BladeMighty: 'Attack the primary target and gain Counter.',
  SpiderWomanJulia: 'Apply Stun to the primary target.',
  RachelColeAlves: 'Attack all enemies. Apply Defense Down.',
  OmegaRedPF: 'Apply Bleed to all enemies.',
  MagnetoPF: 'Apply Barrier to all Mutant allies.',
  Executioner: 'Attack the primary target. Apply Defense Down.',
};

type Iso = 'striker' | 'fortifier' | 'healer' | 'skirmisher' | 'raider';
const ISO_BY_ROLE: Record<string, Iso> = {
  Protector: 'fortifier',
  Support: 'healer',
  Blaster: 'striker',
  Brawler: 'raider',
  Controller: 'skirmisher',
};
/** Demo-only: a few characters whose players clearly prefer another ISO-8 class. */
const ISO_OVERRIDES: Record<string, Partial<Record<Iso, number>>> = {
  Riot: { raider: 0.64, striker: 0.22, skirmisher: 0.14 },
  Thor: { striker: 0.68, raider: 0.2, skirmisher: 0.12 },
  Knull: { raider: 0.42, striker: 0.4, fortifier: 0.18 },
  SpiderMan: { raider: 0.58, skirmisher: 0.3, striker: 0.12 },
};

function isoAdoption(id: string): Partial<Record<Iso, number>> {
  if (ISO_OVERRIDES[id]) return ISO_OVERRIDES[id];
  const iso = MOCK_ROSTER.find((c) => c.id === id)?.iso8;
  const owned = iso && typeof iso !== 'string' ? iso.active : undefined;
  const role = MOCK_CHARACTERS.find((c) => c.id === id)
    ?.traits?.map((t) => (typeof t === 'string' ? t : t.id))
    .find((t) => ISO_BY_ROLE[t]);
  const main = owned ?? (role ? ISO_BY_ROLE[role] : 'striker');
  return { [main]: 0.6, ...(main === 'striker' ? { raider: 0.25 } : { striker: 0.25 }) };
}

/** Demo-only T4 adoption: most players start with the passive, some characters differ. */
function t4Adoption(id: string) {
  return ['Phoenix', 'Shuri', 'Mantis', 'Groot'].includes(id)
    ? { special: 0.82, passive: 0.75, ultimate: 0.6, basic: 0.2 }
    : { passive: 0.88, ultimate: 0.71, special: 0.52, basic: 0.24 };
}

/** Shape of what `getAbilityKits` keeps from GET /game/v1/characters?abilityKits=max. */
export const MOCK_KITS: CharacterKit[] = MOCK_CHARACTERS.map((c) => ({
  id: c.id,
  name: c.name,
  traits: (c.traits ?? []).map((t) => (typeof t === 'string' ? { id: t, name: t } : t)),
  texts: {
    basic: 'Attack the primary target.',
    ...(SPECIALS[c.id] ? { special: SPECIALS[c.id] } : {}),
    ...(PASSIVES[c.id] ? { passive: PASSIVES[c.id] } : {}),
  },
  isoAdoption: isoAdoption(c.id),
  t4Adoption: t4Adoption(c.id),
}));
