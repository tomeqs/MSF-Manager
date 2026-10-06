import { TeamTab } from '../models';

/**
 * "Plug-and-play" characters that community guides add to many lineups, so one investment
 * pays off in several modes. Compiled October 2026 (see `source`); edit freely.
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
    why: 'Uniwersalna (październik 2026): tarcze dla drużyny i kontra na Blue Marvel.',
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
    why: 'Darmowy z Battleworld (wrzesień 2026); dokłada dużo obrażeń do dowolnej drużyny.',
    source: 'https://marvelstrikeforce.com/en/updates/blog-update-9-24-26',
  },
  {
    name: 'Apocalypse',
    modes: ['arena', 'war'],
    why: 'Najczęstszy zamiennik w Secret Defenders na arenie.',
    source: `${CHURCH}/secret-defender/`,
  },
];
