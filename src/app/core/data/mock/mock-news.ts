import type { GameSnapshot } from '../../state/news';

const DAY_MS = 24 * 3600 * 1000;

/**
 * Demo-only "last visit": today's game minus a few things, so the demo shows what Nowości
 * looks like (new characters, reworks, new events and a new team trait).
 */
export function mockPreviousSnapshot(current: GameSnapshot): GameSnapshot {
  const without = <T>(record: Record<string, T>, ids: string[]) =>
    Object.fromEntries(Object.entries(record).filter(([id]) => !ids.includes(id)));
  return {
    at: current.at - 3 * DAY_MS,
    characters: without(current.characters, ['Executioner', 'OmegaRedPF']),
    kits: current.kits && {
      ...current.kits,
      Toxin: 'previous',
      Riot: 'previous',
    },
    events: without(current.events, ['mock-wakanda', 'mock-mystic-campaign']),
    teamTraits: without(current.teamTraits, ['Symbiote']),
  };
}
