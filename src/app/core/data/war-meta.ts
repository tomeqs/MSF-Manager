/**
 * Alliance War knowledge the app plans with: which defenses to expect, how to beat them (with
 * the community punch-up rating) and how the War teams are doing now. Hand-maintained from
 * `reports/Składy i postacie MSF listopad.md` (4 November 2026, counters from marvel.church's
 * undated counter pages — some may predate the 13.10 and 27.10 reworks) and the official posts
 * up to 7 November 2026. Research came from search snippets; the pages were not reachable.
 *
 * Team names refer to `KNOWN_META`; `members` slots use the same "A|B" syntax.
 */
export const WAR_META_AS_OF = '7 listopada 2026';

/** What is known about the War season now running (shown above the War plan). */
export const WAR_SEASON_NOTE =
  'Nowy sezon Wojny ogłoszono 5.11 (nowe reguły, nowe koszty War Tech Mods, shardy Wasp (Janet) ' +
  'w nagrodach), ale treści wpisu nie udało się odczytać — sprawdź reguły pokojów w grze. ' +
  'Od 8.11 do końca rozdziału: Sabretooth (Breaker) z 3 sojusznikami Menace nakłada 2 Exhausted ' +
  'na wrogiego Blue Marvela (po Ultimate) i Xaviera (po Special), Menace ma Revive Once.';

/** Community punch-up: how much stronger the attacker may be outmatched (▲) or must be (▼). */
export type Punch = '▲▲▲' | '▲▲' | '▲' | '⊜' | '▼' | '▼▼' | '▼▼▼';

export const PUNCH_LABELS: Record<Punch, string> = {
  '▲▲▲': 'wygrywa nawet ok. 20% słabszym',
  '▲▲': 'wygrywa ok. 10% słabszym',
  '▲': 'wygrywa ok. 5% słabszym',
  '⊜': 'potrzebuje równej siły',
  '▼': 'potrzebuje ok. 10% przewagi',
  '▼▼': 'potrzebuje dużej przewagi',
  '▼▼▼': 'tylko z ogromną przewagą',
};

export interface WarCounter {
  /** As the sources write it, e.g. "Brimstone + Oath". */
  label: string;
  /** Known team (`KNOWN_META` name) it is built on… */
  team?: string;
  /** …or the strongest five with a trait… */
  trait?: string;
  /** …or an exact line-up. */
  members?: string[];
  /** Characters added to the team (they replace its least useful members). */
  plus?: string[];
  /** Team members to leave out ("bez Riota"). */
  minus?: string[];
  punch?: Punch;
  /** OFF = official post, 3P = fan site, SZAC. = inference. */
  confidence: string;
  note?: string;
}

export interface WarDefense {
  /** The defense (`KNOWN_META` name). */
  team: string;
  /** Who to take down first, or what to watch out for. */
  focus?: string;
  counters: WarCounter[];
  source: string;
}

/** How a War team is doing now. */
export type WarTrend = 'new' | 'holds' | 'fading';

export const TREND_LABELS: Record<WarTrend, string> = {
  new: 'nowa, niesprawdzona',
  holds: 'nadal się sprawdza',
  fading: 'słabnie',
};

export interface WarTeamStatus {
  trend: WarTrend;
  note: string;
  confidence: string;
}

const CHURCH = 'https://www.marvel.church';
const BLOG = 'https://marvelstrikeforce.com/en/updates';

/** Per `KNOWN_META` team name. Only teams the sources say something current about. */
export const WAR_TEAM_STATUS: Record<string, WarTeamStatus> = {
  'Timeless Eternals': {
    trend: 'holds',
    note: 'Nadal najnowsza obrona; Gilgamesh odpiera Offense Up, Speed Up, Deathproof i Barrier, więc na papierze trzyma się też przeciw Menace.',
    confidence: 'OFF/3P, SZAC.',
  },
  Brimstone: {
    trend: 'holds',
    note: 'Najczęściej wymieniany atak (▲▲▲ na Hellfire Club i Accursed) i najbardziej uniwersalny dla gracza bez endgame’u; na Shadow Conclave słabszy (▼▼).',
    confidence: '3P, SZAC.',
  },
  'Symbiote Six': {
    trend: 'holds',
    note: 'Obrona i atak; z Knullem cel nowego Savage Land.',
    confidence: '3P/OFF',
  },
  'West Coast Avengers': {
    trend: 'holds',
    note: 'Globalna reguła z 21.09 (Offense Down zamieniane w turze) nadal bez ogłoszonego końca; pass #3 Wasp (Janet) wzmocnił ją też na Brimstone.',
    confidence: 'OFF',
  },
  Menace: {
    trend: 'new',
    note: 'Od 2.11 (Sabretooth odblokowany najwcześniej 11.11); w ataku +3000% Resistance (3P); reguła z 8.11 do końca rozdziału. Brak wyników walk.',
    confidence: 'OFF/3P',
  },
  'Savage Land': {
    trend: 'new',
    note: 'Ka-Zar od 6.11; reklamowana jako „top-tier”, celuje w Symbiote Six z Knullem; według 3P premie działają też w obronie. Brak wyników walk.',
    confidence: 'OFF/3P',
  },
  Nightreavers: {
    trend: 'new',
    note: 'Od 13.10; bez Draculi (wraca w 2027) słabsza; w obronie traci większość premii.',
    confidence: 'OFF',
  },
  'Hellfire Club': {
    trend: 'fading',
    note: 'Odeszła z rajdu (17.09); nadal opcja obrony, ale ▲▲▲ bije ją wiele ataków.',
    confidence: 'OFF/3P',
  },
};

export const WAR_DEFENSES: WarDefense[] = [
  {
    team: 'Timeless Eternals',
    focus:
      'Najpierw Gilgamesh (jedyne źródło Eternal Saga). Kontry nie działają przy aktywnych Barracks wroga.',
    counters: [
      { label: 'Brimstone + Oath', team: 'Brimstone', plus: ['Oath|Kang|Cable'], confidence: '3P' },
      {
        label: 'Symbiote Six + Oath (bez Riota)',
        team: 'Symbiote Six',
        plus: ['Oath'],
        minus: ['Riot'],
        confidence: '3P',
        note: 'Special Toxina stunuje Gilgamesha.',
      },
      {
        label: 'Storm (Mighty) + Quasar + Old Man Logan + Odin + Oath',
        members: ['Storm (Mighty)', 'Quasar', 'Old Man Logan', 'Odin', 'Oath'],
        confidence: '3P',
      },
      {
        label: 'Illuminati + Odin + Sentry',
        trait: 'Illuminati',
        plus: ['Odin', 'Sentry'],
        confidence: '3P',
        note: 'Ultimate Captain Britain w Gilgamesha.',
      },
      {
        label: 'Savage Land',
        team: 'Savage Land',
        confidence: 'SZAC.',
        note: 'Przypuszczenie: Cyclops (Mighty) blokuje Speed Up, a Eternal Saga nie chroni przed Speed Barem. Nikt tego nie sprawdził.',
      },
    ],
    source: `${CHURCH}/defense-team-counters/`,
  },
  {
    team: 'Symbiote Six',
    focus:
      'Kolejność: Riot → Quicksilver (Symbiote) → Toxin. Spowolnienie nie działa, Speed Bar tak.',
    counters: [
      {
        label: 'Winter Guard + Professor Xavier',
        team: 'Winter Guard',
        plus: ['Professor Xavier'],
        confidence: '3P',
        note: 'Najwyżej oceniana.',
      },
      {
        label: 'Quasar + Old Man Logan + Odin + Oath + Storm',
        members: ['Quasar', 'Old Man Logan', 'Odin', 'Oath', 'Storm (Mighty)|Storm'],
        confidence: '3P',
        note: 'Special Old Man Logana w Riota.',
      },
      { label: 'Brimstone + Odin', team: 'Brimstone', plus: ['Odin'], confidence: '3P' },
      { label: 'Shadow Conclave', team: 'Shadow Conclave', confidence: '3P' },
      {
        label: 'Savage Land',
        team: 'Savage Land',
        confidence: 'OFF',
        note: 'Zaprojektowana na Symbiote Six z Knullem (zamiar twórców, nie wynik walk).',
      },
    ],
    source: `${CHURCH}/symbiote-six/`,
  },
  {
    team: 'Winter Guard',
    focus: 'Przetrwaj okno do pierwszej tury Ursy Majora (do tego czasu −50% obrażeń i odporność).',
    counters: [
      {
        label: 'Brimstone + Professor Xavier',
        team: 'Brimstone',
        plus: ['Professor Xavier'],
        punch: '▲▲▲',
        confidence: '3P',
      },
      {
        label: 'Brimstone + Apocalypse',
        team: 'Brimstone',
        plus: ['Apocalypse'],
        punch: '▲▲',
        confidence: '3P',
      },
      {
        label: 'Xavier + Quasar + Blade + Oath + Agatha Harkness',
        members: ['Professor Xavier', 'Quasar', 'Blade', 'Oath', 'Agatha Harkness'],
        confidence: '3P',
      },
      { label: 'West Coast Avengers', team: 'West Coast Avengers', confidence: 'OFF' },
      { label: 'Nightreavers', team: 'Nightreavers', confidence: 'OFF' },
      { label: 'Shadow Conclave', team: 'Shadow Conclave', confidence: 'OFF' },
    ],
    source: `${CHURCH}/winter-guard/`,
  },
  {
    team: 'Brimstone',
    focus: 'Brimstone nie blokuje obniżania Speed — Emma Frost (−10% Speed całej drużynie) pomaga.',
    counters: [
      { label: 'Winter Guard', team: 'Winter Guard', punch: '▲▲', confidence: '3P' },
      { label: 'Nightreavers', team: 'Nightreavers', confidence: 'OFF' },
      {
        label: 'West Coast Avengers',
        team: 'West Coast Avengers',
        confidence: 'OFF',
        note: 'Wasp (Janet) po passie #3.',
      },
      { label: 'Shadow Conclave', team: 'Shadow Conclave', confidence: 'OFF' },
    ],
    source: `${CHURCH}/brimstone/`,
  },
  {
    team: 'Shadow Conclave',
    counters: [
      { label: 'West Coast Avengers', team: 'West Coast Avengers', confidence: 'OFF' },
      { label: 'Nightreavers', team: 'Nightreavers', confidence: 'OFF' },
      { label: 'Brimstone', team: 'Brimstone', punch: '▼▼', confidence: '3P' },
      { label: 'Winter Guard', team: 'Winter Guard', punch: '▼▼▼', confidence: '3P' },
    ],
    source: `${CHURCH}/shadow-conclave/`,
  },
  {
    team: 'Hellfire Club',
    focus: 'Zastunuj Sebastiana Shawa (np. Specialem Black Cat).',
    counters: [
      { label: 'Brimstone', team: 'Brimstone', punch: '▲▲▲', confidence: '3P' },
      { label: 'Undying', team: 'Undying', punch: '▲▲▲', confidence: '3P' },
      { label: 'Secret Warriors', team: 'Secret Warriors', punch: '▲▲▲', confidence: '3P' },
      { label: 'Secret Defenders', team: 'Secret Defenders', punch: '▲▲▲', confidence: '3P' },
      { label: 'Illuminati', trait: 'Illuminati', punch: '▲▲▲', confidence: '3P' },
    ],
    source: `${CHURCH}/alliance-war-defense-list/`,
  },
  {
    team: 'Accursed',
    counters: [
      { label: 'Undying', team: 'Undying', punch: '▲▲▲', confidence: '3P' },
      { label: 'Brimstone', team: 'Brimstone', punch: '▲▲▲', confidence: '3P' },
      { label: 'Secret Warriors', team: 'Secret Warriors', punch: '▲▲▲', confidence: '3P' },
    ],
    source: `${CHURCH}/accursed/`,
  },
  {
    team: 'Absolute A-Force',
    counters: [
      { label: 'Absolute A-Force (lustro)', team: 'Absolute A-Force', confidence: '3P' },
      { label: 'Gamma + Mephisto', trait: 'Gamma', plus: ['Mephisto'], confidence: '3P' },
      {
        label: 'Brimstone',
        team: 'Brimstone',
        confidence: '3P',
        note: 'Stun, Ability Block i zakłócanie Charge.',
      },
      { label: 'Liberty', trait: 'Liberty', confidence: '3P' },
      {
        label: 'Astral',
        team: 'Astral',
        punch: '▼',
        confidence: '3P',
        note: '„Needs a solid roster”.',
      },
    ],
    source: `${CHURCH}/absolute-a-force/`,
  },
  {
    team: 'Undying',
    focus: 'Xavier i Brimstone blokują Speed Up Undying na starcie.',
    counters: [
      {
        label: 'Astral + Blue Marvel',
        team: 'Astral',
        plus: ['Blue Marvel'],
        punch: '▲▲▲',
        confidence: '3P',
      },
    ],
    source: `${CHURCH}/undying/`,
  },
  {
    team: 'Annihilators',
    focus: 'Z Knullem lub Mephisto jako piątym — na Mephisto działa Odin + dowolna czwórka.',
    counters: [
      {
        label: 'Brimstone (na wersję z Knullem)',
        team: 'Brimstone',
        confidence: '3P',
      },
      {
        label: 'Undying (na wersję z Knullem)',
        team: 'Undying',
        confidence: '3P',
      },
      {
        label: 'Fantastic Four (MCU) (na wersję z Mephisto)',
        team: 'Fantastic Four (MCU)',
        confidence: '3P',
      },
    ],
    source: `${CHURCH}/arena-alliance-offense-blitz-list/`,
  },
  {
    team: 'Fantastic Four (MCU)',
    focus: 'Najpierw Franklin Richards.',
    counters: [
      {
        label: 'Secret Defenders',
        team: 'Secret Defenders',
        confidence: '3P',
        note: 'Special Black Cat stunuje Franklina.',
      },
    ],
    source: `${CHURCH}/fantastic-four-mcu/`,
  },
];
