import { TeamTab } from '../models';

/**
 * Hand-maintained fallback used only while the API's team analysis is unavailable.
 *
 * Compiled from community guides and official posts (see `source` per team), 9 October 2026
 * (Crucible Season 25, Trepidation raid with Iron Raiders, War season of September); checked
 * again 19 October 2026 — tiers unchanged, Nightreavers added — 2 November 2026: the new
 * War offense squads Menace and Savage Land added (rated before release, see comments) — and
 * 4 November 2026: squads unchanged, Crucible stage 6 corrected, Menace and Savage Land roles,
 * line-ups from the guides, Winter Guard and Shadow Conclave added. Research
 * came from search snippets — the guides themselves were not reachable —
 * so treat tiers as a well-informed estimate. It is NOT live data and goes stale as new teams
 * release — edit freely.
 *
 * `members` lists the lineup by in-game character name; "A|B" means A, or B when A is not
 * owned (also usable for alternative spellings). Names are matched against the game data
 * ignoring case and punctuation; names that cannot be found are reported in the UI so the
 * spelling can be fixed here. `traits` (instead of `members`) builds the best five from
 * every character with that trait.
 */
/**
 * S = top of the current meta, A = strong, B = viable / budget. War roles: Timeless Eternals and
 * Hellfire Club defense; West Coast Avengers, Omen, Secret Warriors, Nightreavers, Menace and
 * Savage Land offense (research of 14.10 and official posts); the rest either.
 */
export type TeamTier = 'S' | 'A' | 'B';

export interface KnownTeam {
  name: string;
  /** Modes the sources call the team strong in. Blitz lists every team. */
  modes: TeamTab[];
  /** How strong the sources rate it now (default A). Weighs its members in the ranking. */
  tier?: TeamTier;
  members?: string[];
  traits?: string[];
  /** Alliance War: where the sources say it belongs (absent = either). */
  war?: 'offense' | 'defense';
  /** Line-up advice from the sources (who goes where). */
  lineup?: string;
  source: string;
}

export const KNOWN_META_AS_OF = '4 listopada 2026';

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
    // Works from a 3-man core; Xavier, Nightcrawler and Mephisto/Odin/Quasar are common
    // fillers. In War The Thing gets +75% Speed Bar and moves first.
    members: [
      'Mister Fantastic (MCU)',
      'Invisible Woman (MCU)',
      'Franklin Richards',
      'Human Torch|Professor Xavier|Nightcrawler',
      'The Thing|Thing|Mephisto|Odin|Quasar',
    ],
    lineup:
      'Franklin rusza pierwszy, Invisible Woman (MCU) druga; ISO-8: Skirmisher na Franklinie, Striker na Invisible Woman (MCU).',
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
    // July 2024 team; endgame players swap Silver Surfer / Ultimus for Mythics. Gladiator and
    // Thanos (Endgame) are the must-haves. The two guides disagree on the line-up.
    members: ['Gorr', 'Ultimus', 'Silver Surfer', 'Thanos (Endgame)', 'Gladiator'],
    lineup:
      'Gorr w rogu, Silver Surfer w środku, Thanos (Endgame) między nimi, Ultimus obok Gladiatora (marvel.church); Theria: Gladiator – Ultimus – Silver Surfer – Thanos (Endgame) – Gorr.',
    source: `${CHURCH}/annihilators/`,
  },
  // --- Alliance War ---
  {
    name: 'Timeless Eternals',
    modes: ['war'],
    tier: 'S',
    war: 'defense',
    // Top defense (same bonuses on offense); weak to Speed manipulation.
    members: ['Gilgamesh', 'Thena', 'Kingo', 'Ikaris', 'Sersi'],
    source: `${BLOG}/blog-update-7-29-26`,
  },
  {
    name: 'West Coast Avengers',
    modes: ['war'],
    tier: 'S',
    war: 'offense',
    lineup: 'Tigra (Protector) w rogu, War Machine obok niej.',
    // Offense; counters Shadow Conclave and Winter Guard.
    members: ['Wasp (Janet)', 'Hawkeye', 'Tigra', 'Mockingbird', 'War Machine'],
    source: `${BLOG}/blog-update-9-14-26`,
  },
  {
    name: 'Brimstone',
    modes: ['war'],
    tier: 'S',
    // Offense: strong punch-up into Hellfire Club and Accursed, punch-down into Shadow Conclave.
    // As a defense it is targeted by Nightreavers, West Coast Avengers and Shadow Conclave.
    lineup: 'Daimon Hellstrom zawsze pierwszy — otwórz jego Ultimate.',
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
    war: 'offense',
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
    war: 'offense',
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
    name: 'Nightreavers',
    modes: ['war'],
    tier: 'B',
    war: 'offense',
    // New 3-character War offense (13.10.2026) against Winter Guard, Brimstone and Shadow
    // Conclave; Dracula came only from King of the Night (19.10 – ~2.11.2026), next in 2027.
    // Rated B+/A only with Dracula; the official post suggests Blade and Kestrel (Zombie) for
    // slots 4–5. Loses most bonuses on defense.
    members: ['Dracula', 'Morbius', 'Oath', 'Blade', 'Kestrel (Zombie)'],
    source: `${BLOG}/blog-update-10-13-26`,
  },
  {
    name: 'Menace',
    modes: ['war'],
    tier: 'A',
    war: 'offense',
    // War offense (27.10.2026): Sabretooth (Breaker) — first Corruption character, released by
    // the Breaker Event from 2.11, first unlock 11.11 — plus reworked Blob, Toad, Silver
    // Samurai and Stryfe. Rated before anyone could test it: older tier lists rank the
    // pre-rework members last. From 8.11 a temporary War rule (Sabretooth + 3 Menace allies)
    // favours it until the chapter ends. Roles: Sabretooth and Toad Controllers, Blob, Silver
    // Samurai and Stryfe Protectors; Toad draws almost all its power from Blob. No positions given.
    lineup: 'Toad tylko z Blobem; nie łącz Sabretootha z Mephisto (traci Exhausted).',
    members: ['Sabretooth (Breaker)', 'Blob', 'Toad', 'Silver Samurai', 'Stryfe'],
    source: `${BLOG}/blog-update-10-27-26`,
  },
  {
    name: 'Savage Land',
    modes: ['war'],
    tier: 'A',
    war: 'offense',
    // War offense announced 28.10.2026 as "the new top-tier Alliance War squad" (official
    // marketing, not a community rating): new Ka-Zar (from 6.11), Sauron and Cyclops (Mighty)
    // with upgraded Rogue and X-23. The five is confirmed by marvel.church (roles of all five)
    // and the datamined SAVAGE LAND trait. marvel.church says the War bonuses work on defense
    // too; kept as offense because the official text is about tearing into defenses.
    lineup: 'Rogue i X-23 obok siebie (osłaniają nowe postacie); Sauron rusza pierwszy.',
    members: ['Ka-Zar', 'Sauron', 'Cyclops (Mighty)', 'Rogue', 'X-23'],
    source: `${CHURCH}/savage-land/`,
  },
  {
    name: 'Hellfire Club',
    modes: ['war'],
    tier: 'B',
    war: 'defense',
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
  {
    name: 'Winter Guard',
    modes: ['war', 'crucible'],
    tier: 'B',
    // The snippets never listed the full five, so the trait picks them. Until Ursa Major's first
    // turn the team has +50% Damage Reduction and Resistance and enemies cannot gain Immunity,
    // Defense Up or Possessed; three official squads were built to counter it. Crucible S25
    // budget defense for stages 4 and 6. No current tier found (B = budget).
    traits: ['Winter Guard'],
    source: `${CHURCH}/winter-guard/`,
  },
  {
    name: 'Shadow Conclave',
    modes: ['war', 'crucible'],
    tier: 'B',
    // Officially built to beat Winter Guard and Brimstone; targeted by West Coast Avengers and
    // Nightreavers. Crucible S25 budget defense for stage 4. No current tier found (B = budget).
    members: ['Sylvie', 'Thanos', 'High Evolutionary', 'Executioner', 'Malekith'],
    source: `${BLOG}/powers-gather-in-shadow`,
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
    // Offense only (Scorpion (Breaker) has no defensive bonuses); buffed in Season 25. Strong
    // punch-up into Immortal Weapon + Void Knight, smaller into New Mutants.
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
    // Stage 4: + Annihilus/Quasar instead of Jubilee or Wolverine. With Odin instead of
    // Wolverine it is the top-rated counter to Symbiote Six (+ Xavier).
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
    name: 'Fantastic Four (MCU) — etap 6',
    modes: ['crucible'],
    tier: 'S',
    // Season 25 stage 6 defense: best FF (MCU) + Sentry + Blue Marvel, optimal + Captain
    // Britain + Nightcrawler (corrects the 19.10 "+ Captain Britain + Blue Marvel").
    members: [
      'Mister Fantastic (MCU)',
      'Invisible Woman (MCU)',
      'Franklin Richards',
      'Sentry|Captain Britain',
      'Blue Marvel|Nightcrawler',
    ],
    source: `${CHURCH}/cosmic-crucible-the-best-defensive-setup/`,
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
    modes: ['raids', 'crucible'],
    tier: 'S',
    // Mandatory from difficulty 8; also the shared boss. Crucible S25: budget defense for
    // stage 2 and a punch-up into Starjammers.
    members: ['Blade (Mighty)', 'Spider-Woman (Julia)', 'Rachel Cole-Alves', 'Spider-Man', 'Hulk'],
    source: `${BLOG}/blog-update-9-17-26`,
  },
  {
    name: 'Champions',
    modes: ['raids'],
    tier: 'A',
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
    modes: ['raids', 'crucible'],
    tier: 'A',
    // The lane can reportedly be cleared without them (Non-Mythic Mystic). Crucible S25:
    // + Captain Britain is the budget defense for stage 1.
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
