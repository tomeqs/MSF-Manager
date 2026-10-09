import { TeamTab } from '../models';

/**
 * Hand-maintained fallback used only while the API's team analysis is unavailable.
 *
 * Compiled from community guides and official posts (see `source` per team), last updated
 * 9 October 2026 (Crucible Season 25, Trepidation raid with Iron Raiders, War season of
 * September). Research came from search snippets — the guides themselves were not reachable —
 * so treat tiers as a well-informed estimate. It is NOT live data and goes stale as new teams
 * release — edit freely.
 *
 * `members` lists the lineup by in-game character name; "A|B" means A, or B when A is not
 * owned (also usable for alternative spellings). Names are matched against the game data
 * ignoring case and punctuation; names that cannot be found are reported in the UI so the
 * spelling can be fixed here. `traits` (instead of `members`) builds the best five from
 * every character with that trait.
 */
/** S = top of the current meta, A = strong, B = viable / budget. */
export type TeamTier = 'S' | 'A' | 'B';

export interface KnownTeam {
  name: string;
  /** Modes the sources call the team strong in. Blitz lists every team. */
  modes: TeamTab[];
  /** How strong the sources rate it now (default A). Weighs its members in the ranking. */
  tier?: TeamTier;
  members?: string[];
  traits?: string[];
  source: string;
}

export const KNOWN_META_AS_OF = '9 października 2026';

const CHURCH = 'https://www.marvel.church';
const BLOG = 'https://marvelstrikeforce.com/en/updates';

export const KNOWN_META: KnownTeam[] = [
  // --- Arena ---
  {
    name: 'Symbiote Six',
    modes: ['arena', 'crucible', 'war'],
    tier: 'S',
    // Crucible Season 25 / Ultimate 32 stage 1: Symbiote Six + Professor Xavier.
    members: [
      'Quicksilver (Symbiote)',
      'Riot',
      'Toxin',
      'Professor Xavier|Venom',
      'Annihilus|Knull',
    ],
    source: `${CHURCH}/symbiote-six/`,
  },
  {
    name: 'Fantastic Four (MCU)',
    modes: ['arena', 'crucible', 'war'],
    tier: 'S',
    // Works from a 3-man core; Xavier and Mephisto/Odin/Quasar are common fillers.
    members: [
      'Mister Fantastic (MCU)',
      'Invisible Woman (MCU)',
      'Franklin Richards',
      'Human Torch|Professor Xavier',
      'The Thing|Mephisto|Odin|Quasar',
    ],
    source: `${CHURCH}/fantastic-four-mcu/`,
  },
  {
    name: 'Secret Defenders',
    modes: ['arena', 'crucible'],
    tier: 'B',
    members: [
      'Black Cat',
      'Photon',
      'Ghost Rider (Robbie)',
      'Ms. Marvel (Hard Light)',
      'Doctor Strange|Apocalypse',
    ],
    source: `${CHURCH}/secret-defender/`,
  },
  {
    name: 'Annihilators',
    modes: ['arena', 'war'],
    tier: 'B',
    // July 2024 team; endgame players swap Silver Surfer / Ultimus for Mythics.
    members: ['Gorr', 'Ultimus', 'Silver Surfer', 'Thanos (Endgame)', 'Gladiator'],
    source: `${CHURCH}/annihilators/`,
  },
  // --- Alliance War ---
  {
    name: 'Timeless Eternals',
    modes: ['war'],
    tier: 'S',
    // Top defense (same bonuses on offense); weak to Speed manipulation.
    members: ['Gilgamesh', 'Thena', 'Kingo', 'Ikaris', 'Sersi'],
    source: `${BLOG}/blog-update-7-29-26`,
  },
  {
    name: 'West Coast Avengers',
    modes: ['war'],
    tier: 'S',
    // Offense; counters Shadow Conclave and Winter Guard.
    members: ['Wasp (Janet)', 'Hawkeye', 'Tigra', 'Mockingbird', 'War Machine'],
    source: `${BLOG}/blog-update-9-14-26`,
  },
  {
    name: 'Brimstone',
    modes: ['war'],
    tier: 'S',
    members: [
      'Daimon Hellstrom|Hellstrom',
      'Living Mummy',
      'Strange (Heartless)',
      'Elsa Bloodstone',
      'Hellcat',
    ],
    source: `${CHURCH}/brimstone/`,
  },
  {
    name: 'Omen',
    modes: ['war', 'crucible'],
    tier: 'S',
    // Top attacker into Absolute A-Force; also Crucible offense.
    members: [
      'Silver Surfer (Breaker)',
      'Minn-Erva',
      'Ebony Maw',
      'Ronan the Accuser|Ronan',
      'Cull Obsidian',
    ],
    source: `${CHURCH}/omen/`,
  },
  {
    name: 'Undying',
    modes: ['war'],
    tier: 'A',
    members: [
      'Hela',
      'Scarlet Witch (Zombie)',
      'Kestrel (Zombie)',
      'Iron Man (Zombie)',
      'Juggernaut (Zombie)',
    ],
    source: `${CHURCH}/undying/`,
  },
  {
    name: 'Secret Warriors',
    modes: ['war'],
    tier: 'A',
    // Offense only — loses its bonuses on defense.
    members: ['Yo-Yo', 'Domino', 'Phantom Rider', 'Quake', 'Negasonic|Negasonic Teenage Warhead'],
    source: `${CHURCH}/secret-warrior/`,
  },
  {
    name: 'Absolute A-Force',
    modes: ['war'],
    tier: 'B',
    members: ['Ms. Marvel (Classic)|Ms. Marvel', 'Wasp', 'Ironheart', 'Kahhori', 'Medusa'],
    source: `${CHURCH}/absolute-a-force/`,
  },
  {
    name: 'Hellfire Club',
    modes: ['war'],
    tier: 'B',
    // Left the Trepidation raid (official 17.09.2026); still a War defense option.
    members: ['Sebastian Shaw', 'Emma Frost', 'Azazel', 'Madelyne Pryor', 'Rachel Summers'],
    source: `${CHURCH}/alliance-war-defense-list/`,
  },
  {
    name: 'Alpha Flight',
    modes: ['war'],
    tier: 'B',
    members: ['Guardian', 'Northstar', 'Sasquatch', 'Sunfire', 'Wolverine'],
    source: `${CHURCH}/alpha-flight/`,
  },
  {
    name: 'Astral',
    modes: ['war'],
    tier: 'B',
    members: ['Doctor Strange', 'Moondragon', 'Ancient One', 'Emma Frost (X-Men)', 'Shadow King'],
    source: `${CHURCH}/astral/`,
  },
  // --- Cosmic Crucible (Season 25 from 14.10.2026, rule "Artificial Dread") ---
  {
    name: 'A.I. Avengers',
    modes: ['crucible'],
    tier: 'S',
    // Offense and defense; buffed by the Season 25 global rule.
    members: ['Jocasta', 'Ultron', 'Vision', 'Human Torch (Jim)', 'Hawkeye (Robot)'],
    source: `${BLOG}/blog-update-9-30-26`,
  },
  {
    name: 'Dread',
    modes: ['crucible'],
    tier: 'S',
    // Offense only (Scorpion (Breaker) has no defensive bonuses); buffed in Season 25.
    members: ['Scorpion (Breaker)', 'Mister Negative', 'Bullseye', 'Electro', 'Rhino'],
    source: `${CHURCH}/dread/`,
  },
  {
    name: 'Accursed',
    modes: ['crucible', 'war'],
    tier: 'S',
    // Season 25 stage 2 optimal: Accursed + Odin.
    members: [
      'Juggernaut',
      'Hellverine',
      'Satana',
      'The Hood|Hood',
      'Baron Mordo|Mordo|Odin|Quasar|Mephisto',
    ],
    source: `${CHURCH}/accursed/`,
  },
  {
    name: 'Exalted X-Men',
    modes: ['crucible'],
    tier: 'S',
    // Stage 4: + Annihilus/Quasar instead of Jubilee or Wolverine.
    members: ['Storm (Mighty)', 'Angel', 'Morph', 'Wolverine|Quasar', 'Jubilee|Annihilus'],
    source: `${BLOG}/exalted-x-men`,
  },
  {
    name: 'Daring Warriors',
    modes: ['crucible'],
    tier: 'S',
    // Stage 2: + Odin instead of Jessica Jones.
    members: [
      'Eclipse',
      'Daredevil',
      'Night Thrasher',
      'Speedball',
      'Jessica Jones|Odin|Blue Marvel',
    ],
    source: `${CHURCH}/daring-warrior/`,
  },
  {
    name: 'Phoenix Force',
    modes: ['crucible'],
    tier: 'S',
    members: [
      'Phoenix',
      'Omega Red (Phoenix Force)',
      'Magneto (Phoenix Force)',
      'Toxin',
      'Mister Fantastic (MCU)|Whiplash',
    ],
    source: `${CHURCH}/cosmic-crucible-ultimate-32/`,
  },
  {
    name: 'Blue Marvel (obrona)',
    modes: ['crucible'],
    tier: 'A',
    members: ['Blue Marvel', 'Executioner', 'Howard the Duck', 'Emma Frost', 'Emma Frost (X-Men)'],
    source: `${CHURCH}/cosmic-crucible-ultimate-32/`,
  },
  {
    name: 'New Mutants',
    modes: ['crucible'],
    tier: 'A',
    members: [
      'Warlock',
      'Sunspot',
      'Wolfsbane',
      'Cannonball',
      'Magik|Silver Surfer (Breaker)|Mephisto',
    ],
    source: `${CHURCH}/new-mutant/`,
  },
  {
    name: 'Starjammers',
    modes: ['crucible'],
    tier: 'A',
    members: [
      'Havok',
      'Lilandra',
      'Rocket Raccoon',
      'Howard the Duck',
      'Groot|Nova (Sam Alexander)',
    ],
    source: `${CHURCH}/starjammer/`,
  },
  // --- Raids: Trepidation (one raid since July 2026; Boss Raid on Wed/Sat) ---
  {
    name: 'Iron Raiders',
    modes: ['raids'],
    tier: 'S',
    // Took Hellfire Club's lane (2 final nodes) and the shared boss.
    members: ['Iron Monger', 'Ulysses Klaue|Klaw', 'Whiplash', 'Crossbones', 'Yellowjacket'],
    source: `${BLOG}/blog-update-9-17-26`,
  },
  {
    name: 'Amazing Avengers',
    modes: ['raids'],
    tier: 'S',
    // Mandatory from difficulty 8; also the shared boss.
    members: ['Blade (Mighty)', 'Spider-Woman (Julia)', 'Rachel Cole-Alves', 'Spider-Man', 'Hulk'],
    source: `${BLOG}/blog-update-9-17-26`,
  },
  {
    name: 'Champions',
    modes: ['raids'],
    tier: 'S',
    members: ['Nova (Sam Alexander)', 'Spider-Man (Miles)', 'Moon Girl', 'Brawn', 'Ms. Marvel'],
    source: `${CHURCH}/champion/`,
  },
  {
    name: 'Insidious Six',
    modes: ['raids'],
    tier: 'S',
    members: ['Superior Spider-Man', 'Scorpion', 'Hobgoblin', 'Shocker', 'Vulture'],
    source: `${CHURCH}/insidious-six/`,
  },
  {
    name: 'Immortal Weapon',
    modes: ['raids'],
    tier: 'A',
    // The lane can reportedly be cleared without them (Non-Mythic Mystic).
    members: ['Steel Serpent', 'Lady Bullseye', 'Sword Master', 'Iron Fist (WWII)', 'Iron Fist'],
    source: `${CHURCH}/raid-list/`,
  },
  // Trait fillers for difficulties 3–7 (Non-Mythic City / Mystic) and older raid teams.
  {
    name: 'Spider-Society (City)',
    modes: ['raids'],
    tier: 'B',
    members: [
      'Spider-Man (Pavitr)',
      'Peni Parker',
      'Peter B. Parker',
      'Ghost-Spider',
      'Spider-Man Noir|Spider-Man (Noir)',
    ],
    source: `${CHURCH}/spider-society/`,
  },
  {
    name: 'Nightstalkers (Mystic)',
    modes: ['raids'],
    tier: 'B',
    members: ['Blade', 'Oath', 'Man-Thing', 'Moon Knight', 'Agatha Harkness'],
    source: `${CHURCH}/nightstalker/`,
  },
  {
    name: 'Orchis',
    modes: ['blitz'],
    tier: 'B',
    // No longer a raid lane (Trepidation); still strong in Blitz.
    members: ['Sentinel', 'Nimrod', 'Omega Sentinel', 'Scientist Supreme', 'Lady Deathstrike'],
    source: 'https://frvr.com/blog/marvel-strike-force-tier-list/',
  },
  {
    name: 'X-Treme X-Men',
    modes: ['blitz'],
    tier: 'B',
    members: ['Nightcrawler', 'Gambit', 'Forge', 'Sunspot', 'Cyclops'],
    source: `${CHURCH}/x-treme-x-men/`,
  },
  {
    name: 'Thunderbolts',
    modes: ['blitz'],
    tier: 'B',
    members: ['Hyperion', 'Songbird', 'Victoria Hand', 'Ghost', 'Taskmaster'],
    source: `${CHURCH}/thunderbolt/`,
  },
  {
    name: 'Bifrost',
    modes: ['blitz'],
    tier: 'B',
    members: ['Vahl', 'Beta Ray Bill', 'Sylvie', 'Loki (Teen)', 'Loki'],
    source: `${CHURCH}/bifrost/`,
  },
];
