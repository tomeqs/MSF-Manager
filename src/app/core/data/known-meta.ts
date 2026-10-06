import { TeamTab } from '../models';

/**
 * Hand-maintained fallback used only while the API's team analysis is unavailable.
 *
 * Compiled from community guides (see `source` per team) in October 2026. It is NOT live
 * data and goes stale as new teams release — edit freely.
 *
 * `members` lists the lineup by in-game character name; "A|B" means A, or B when A is not
 * owned (also usable for alternative spellings). Names are matched against the game data
 * ignoring case and punctuation; names that cannot be found are reported in the UI so the
 * spelling can be fixed here. `traits` (instead of `members`) builds the best five from
 * every character with that trait.
 */
export interface KnownTeam {
  name: string;
  /** Modes the sources call the team strong in. Blitz lists every team. */
  modes: TeamTab[];
  members?: string[];
  traits?: string[];
  source: string;
}

export const KNOWN_META_AS_OF = 'październik 2026';

const CHURCH = 'https://www.marvel.church';

export const KNOWN_META: KnownTeam[] = [
  // --- Arena (strong everywhere) ---
  {
    name: 'Symbiote Six',
    modes: ['arena', 'crucible', 'war'],
    members: [
      'Quicksilver (Symbiote)',
      'Riot',
      'Toxin',
      'Professor Xavier|Venom',
      'Annihilus|Knull',
    ],
    source: `${CHURCH}/arena-meta/`,
  },
  {
    name: 'Fantastic Four (MCU)',
    modes: ['arena', 'crucible', 'war'],
    members: [
      'Mister Fantastic (MCU)',
      'Invisible Woman (MCU)',
      'Human Torch',
      'The Thing',
      'Franklin Richards',
    ],
    source: `${CHURCH}/fantastic-four-mcu/`,
  },
  {
    name: 'Secret Defenders',
    modes: ['arena', 'crucible', 'war'],
    members: [
      'Black Cat',
      'Photon',
      'Ghost Rider (Robbie)',
      'Ms. Marvel (Hard Light)',
      'Apocalypse|Doctor Strange',
    ],
    source: `${CHURCH}/secret-defender/`,
  },
  {
    name: 'Annihilators',
    modes: ['arena', 'crucible', 'war'],
    members: ['Gorr', 'Ultimus', 'Silver Surfer', 'Thanos (Endgame)', 'Gladiator'],
    source:
      'https://www.bluestacks.com/blog/game-guides/marvel-strike-force/msf-best-teams-en.html',
  },

  // --- Alliance War ---
  {
    name: 'Brimstone',
    modes: ['war', 'crucible'],
    members: [
      'Living Mummy',
      'Strange (Heartless)',
      'Daimon Hellstrom|Hellstrom',
      'Elsa Bloodstone',
      'Hellcat',
    ],
    source: `${CHURCH}/brimstone/`,
  },
  {
    name: 'Omen',
    modes: ['war', 'crucible'],
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
    name: 'Timeless Eternals',
    modes: ['war'],
    members: ['Gilgamesh', 'Thena', 'Kingo', 'Ikaris', 'Sersi'],
    source: `${CHURCH}/timeless-eternal/`,
  },
  {
    name: 'West Coast Avengers',
    modes: ['war'],
    members: ['Wasp (Janet)', 'Tigra', 'War Machine', 'Mockingbird', 'Hawkeye'],
    source: `${CHURCH}/west-coast-avenger/`,
  },
  {
    name: 'Absolute A-Force',
    modes: ['war'],
    members: ['Ms. Marvel (Classic)|Ms. Marvel', 'Wasp', 'Ironheart', 'Kahhori', 'Medusa'],
    source: `${CHURCH}/absolute-a-force/`,
  },
  {
    name: 'Secret Warriors',
    modes: ['war'],
    members: ['Yo-Yo', 'Domino', 'Phantom Rider', 'Quake', 'Negasonic|Negasonic Teenage Warhead'],
    source: `${CHURCH}/arena-alliance-offense-blitz-list/`,
  },
  {
    name: 'Undying',
    modes: ['war'],
    members: [
      'Hela',
      'Scarlet Witch (Zombie)',
      'Kestrel (Zombie)',
      'Iron Man (Zombie)',
      'Juggernaut (Zombie)',
    ],
    source: `${CHURCH}/arena-alliance-offense-blitz-list/`,
  },

  // --- Cosmic Crucible ---
  {
    name: 'Accursed',
    modes: ['crucible'],
    members: ['Juggernaut', 'Baron Mordo|Mordo', 'Hellverine', 'Satana', 'The Hood|Hood'],
    source: `${CHURCH}/accursed/`,
  },
  {
    name: 'Exalted X-Men',
    modes: ['crucible'],
    // Ultimate 32 picks swap Jubilee for Annihilus or Quasar.
    members: ['Storm (Mighty)', 'Angel', 'Morph', 'Wolverine', 'Annihilus|Quasar|Jubilee'],
    source: `${CHURCH}/cosmic-crucible-ultimate-32/`,
  },
  {
    name: 'A.I. Avengers',
    modes: ['crucible'],
    members: ['Jocasta', 'Ultron', 'Vision', 'Human Torch (Jim)', 'Hawkeye (Robot)'],
    source: `${CHURCH}/a-i-avenger/`,
  },
  {
    name: 'New Mutants',
    modes: ['crucible'],
    members: ['Magik', 'Warlock', 'Cannonball', 'Wolfsbane', 'Sunspot'],
    source: `${CHURCH}/new-mutant/`,
  },
  {
    name: 'Phoenix Force',
    modes: ['crucible'],
    members: [
      'Phoenix',
      'Omega Red (Phoenix Force)',
      'Magneto (Phoenix Force)',
      'Executioner',
      'Blue Marvel',
    ],
    source: `${CHURCH}/cosmic-crucible-the-best-defensive-setup/`,
  },
  {
    name: 'Starjammers',
    modes: ['crucible', 'war'],
    members: [
      'Havok',
      'Lilandra',
      'Howard the Duck',
      'Groot',
      'Nova (Sam Alexander)|Rocket Raccoon',
    ],
    source: `${CHURCH}/starjammer/`,
  },
  {
    name: 'Daring Warriors',
    modes: ['crucible'],
    members: ['Eclipse', 'Daredevil', 'Night Thrasher', 'Jessica Jones', 'Speedball'],
    source: `${CHURCH}/daring-warrior/`,
  },
  {
    name: 'Astral',
    modes: ['crucible', 'war'],
    members: ['Doctor Strange', 'Moondragon', 'Ancient One', 'Emma Frost (X-Men)', 'Shadow King'],
    source: `${CHURCH}/astral/`,
  },
  {
    name: 'Alpha Flight',
    modes: ['crucible', 'war', 'raids'],
    members: ['Guardian', 'Northstar', 'Sasquatch', 'Sunfire', 'Wolverine'],
    source: `${CHURCH}/alpha-flight/`,
  },

  // --- Raids (Trepidation / Incursion) ---
  {
    name: 'Champions (Hero)',
    modes: ['raids'],
    members: ['Nova (Sam Alexander)', 'Spider-Man (Miles)', 'Moon Girl', 'Brawn', 'Ms. Marvel'],
    source: `${CHURCH}/champion/`,
  },
  {
    name: 'Iron Raiders',
    modes: ['raids'],
    members: ['Iron Monger', 'Ulysses Klaue|Klaw', 'Whiplash', 'Crossbones', 'Yellowjacket'],
    source: `${CHURCH}/iron-raider/`,
  },
  {
    name: 'Amazing Avengers',
    modes: ['raids'],
    members: ['Blade (Mighty)', 'Spider-Woman (Julia)', 'Rachel Cole-Alves', 'Spider-Man', 'Hulk'],
    source: `${CHURCH}/amazing-avenger/`,
  },
  {
    name: 'Orchis (Tech)',
    modes: ['raids', 'war', 'crucible'],
    members: ['Sentinel', 'Nimrod', 'Omega Sentinel', 'Scientist Supreme', 'Lady Deathstrike'],
    source:
      'https://mmoculture.com/tips-guides/marvel-strike-force-best-raid-teams-for-orchis-incursion/',
  },
  {
    name: 'Nightstalkers (Mystic)',
    modes: ['raids'],
    members: ['Blade', 'Oath', 'Man-Thing', 'Moon Knight', 'Agatha Harkness'],
    source: `${CHURCH}/nightstalker/`,
  },
  {
    name: 'Thunderbolts (Bio)',
    modes: ['raids'],
    members: ['Hyperion', 'Songbird', 'Victoria Hand', 'Ghost', 'Taskmaster'],
    source: `${CHURCH}/thunderbolt/`,
  },
  {
    name: 'X-Treme X-Men (Mutant)',
    modes: ['raids'],
    members: ['Nightcrawler', 'Gambit', 'Forge', 'Sunspot', 'Cyclops'],
    source: `${CHURCH}/x-treme-x-men/`,
  },
  {
    name: 'Spider-Society (Skill)',
    modes: ['raids'],
    members: [
      'Spider-Man (Pavitr)',
      'Peni Parker',
      'Peter B. Parker',
      'Ghost-Spider',
      'Spider-Man Noir',
    ],
    source: `${CHURCH}/spider-society/`,
  },
  {
    // Leaving the Trepidation Raid (replaced by Iron Raiders); still useful for Villain/Mutant nodes.
    name: 'Hellfire Club',
    modes: ['raids'],
    members: ['Sebastian Shaw', 'Emma Frost', 'Azazel', 'Madelyne Pryor', 'Rachel Summers'],
    source: `${CHURCH}/hellfire-club/`,
  },
  {
    name: 'Insidious Six (City)',
    modes: ['raids'],
    members: ['Superior Spider-Man', 'Scorpion', 'Hobgoblin', 'Shocker', 'Vulture'],
    source: `${CHURCH}/insidious-six/`,
  },
  {
    name: 'Bifrost (Mystic)',
    modes: ['raids'],
    members: ['Vahl', 'Beta Ray Bill', 'Sylvie', 'Loki (Teen)', 'Loki'],
    source: `${CHURCH}/bifrost/`,
  },
  {
    name: 'Immortal Weapon (Mystic)',
    modes: ['raids', 'crucible'],
    members: ['Steel Serpent', 'Lady Bullseye', 'Sword Master', 'Iron Fist (WWII)', 'Iron Fist'],
    source: `${CHURCH}/immortal-weapon/`,
  },
];
