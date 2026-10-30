import { CharacterKit } from '../../models';
import { MOCK_CHARACTERS } from './mock-characters';

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
  Storm: 'X-Men allies gain +10% Speed. Apply Slow to Mystic enemies.',
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

/** Shape of what `getAbilityKits` keeps from GET /game/v1/characters?abilityKits=max. */
export const MOCK_KITS: CharacterKit[] = MOCK_CHARACTERS.map((c) => ({
  id: c.id,
  name: c.name,
  traits: (c.traits ?? []).map((t) => (typeof t === 'string' ? { id: t, name: t } : t)),
  texts: PASSIVES[c.id]
    ? { basic: 'Attack the primary target.', passive: PASSIVES[c.id] }
    : { basic: 'Attack the primary target.' },
}));
