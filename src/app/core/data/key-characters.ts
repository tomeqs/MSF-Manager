import { TeamTab } from '../models';

/**
 * "Plug-and-play" characters that community guides add to many lineups, so one investment
 * pays off in several modes. Updated 9 October 2026 (Crucible Season 25 / Ultimate 32
 * setups, War season of September; see `source`); edit freely.
 */
export interface KeyCharacter {
  /** In-game name; "A|B" accepts alternative spellings. */
  name: string;
  modes: TeamTab[];
  /** Why it matters, shown in the UI. */
  why: string;
  source: string;
}

const CHURCH = 'https://www.marvel.church';

export const KEY_CHARACTERS: KeyCharacter[] = [
  {
    name: 'Professor Xavier',
    modes: ['arena', 'crucible', 'war'],
    why: 'Blokuje kluczowe buffy przeciwnika; dokładany do Symbiote Six i Fantastic Four (MCU).',
    source: `${CHURCH}/arena-meta/`,
  },
  {
    name: 'Blue Marvel',
    modes: ['crucible', 'war'],
    why: 'Ataki ignorują Defense Up i obniżają Max Health — rdzeń wielu obron w Crucible.',
    source: `${CHURCH}/cosmic-crucible-the-best-defensive-setup/`,
  },
  {
    name: 'Silver Surfer (Breaker)',
    modes: ['war', 'crucible'],
    why: 'Pasuje do niemal każdego ataku w wojnie; omija Defense Up i Safeguard.',
    source: `${CHURCH}/omen/`,
  },
  {
    name: 'Magik (Breaker)',
    modes: ['crucible', 'war', 'arena'],
    why: 'Ofensywa do każdej drużyny (wrzesień 2026): Plates i Barrier na start, chroni przed obniżaniem Max Health przez Blue Marvel.',
    source: 'https://marvelstrikeforce.com/en/updates/blog-update-9-25-26',
  },
  {
    name: 'Annihilus',
    modes: ['arena', 'crucible'],
    why: 'Piąty członek Symbiote Six na arenie i zamiennik w Exalted X-Men na Crucible.',
    source: `${CHURCH}/arena-meta/`,
  },
  {
    name: 'Quasar',
    modes: ['arena', 'crucible'],
    why: 'Szybki Defense Up i Immunity dla drużyny; częsty w obronach areny i Crucible.',
    source: `${CHURCH}/cosmic-crucible-ultimate-32/`,
  },
  {
    name: 'Knull',
    modes: ['arena', 'crucible'],
    why: 'Lider Symbiote Six i zamiennik Annihilusa; mocny w obronie.',
    source: `${CHURCH}/symbiote-six/`,
  },
  {
    name: 'Mephisto',
    modes: ['arena', 'war', 'crucible'],
    why: 'Drużyny z Mephisto są jednym z nielicznych wyjątków, z którymi nie radzi sobie A-Force.',
    source: `${CHURCH}/absolute-a-force/`,
  },
  {
    name: 'Odin',
    modes: ['arena', 'war', 'crucible'],
    why: 'Obrona w wojnie i na arenie; w Crucible z Accursed.',
    source: `${CHURCH}/cosmic-crucible-ultimate-32/`,
  },
  {
    name: 'The Destroyer|Destroyer',
    modes: ['war', 'crucible', 'raids'],
    why: 'Darmowy z Battleworld „Fallen Asgard” (od 29.09.2026); siła w mecie jeszcze niepotwierdzona.',
    source: 'https://marvelstrikeforce.com/en/updates/blog-update-9-24-26',
  },
  {
    name: 'Toxin',
    modes: ['arena', 'crucible'],
    why: 'Członek Symbiote Six i piąty w Phoenix Force — dwie obrony S w Crucible.',
    source: `${CHURCH}/cosmic-crucible-ultimate-32/`,
  },
  {
    name: 'Captain Britain',
    modes: ['crucible'],
    why: 'Częsty dodatek do obron Crucible (np. Fantastic Four (MCU) + Blue Marvel).',
    source: `${CHURCH}/cosmic-crucible-the-best-defensive-setup/`,
  },
  {
    name: 'Sentry',
    modes: ['crucible'],
    why: 'Zamiennik w obronach Crucible obok Fantastic Four (MCU).',
    source: `${CHURCH}/cosmic-crucible-the-best-defensive-setup/`,
  },
];
