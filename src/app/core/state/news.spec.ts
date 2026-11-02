import { CharacterKit, EventInfo, RosterEntry } from '../models';
import { isEmptyNews, newsSince, snapshotOf, teamTraits } from './news';
import { toRosterEntry } from './roster.mapper';

const t = (id: string) => ({ id, name: id });
const entry = (id: string, traits: string[], power = 1): RosterEntry =>
  toRosterEntry({ id, name: id, traits: traits.map(t) }, { id, level: 90, power });
const kit = (id: string, passive: string): CharacterKit => ({ id, traits: [], texts: { passive } });
const event = (id: string, endTime: number): EventInfo => ({
  id,
  type: 'milestone',
  name: id,
  startTime: 0,
  endTime,
});

describe('game news', () => {
  const base = [
    entry('A', ['Hero', 'Symbiote'], 5),
    entry('B', ['Hero', 'Symbiote'], 9),
    entry('C', ['Villain', 'Symbiote']),
  ];

  it('treats small shared traits as teams, not origins or roles', () => {
    const traits = teamTraits([...base, entry('D', ['Hero'])]);
    expect(traits.map((x) => x.id)).toEqual(['Symbiote']);
    expect(traits[0].members.map((m) => m.id)).toEqual(['B', 'A', 'C']);
  });

  it('lists new characters, reworked kits, new events and new team traits', () => {
    const before = snapshotOf(base, [kit('A', 'old'), kit('B', 'same')], [event('e1', 9e9)], 1_000);
    const now = [...base, ...['M1', 'M2', 'M3'].map((id) => entry(id, ['Menace']))];
    const events = [event('e1', 9e9), event('e2', 9e9), event('gone', 0)];
    const after = snapshotOf(now, [kit('A', 'new'), kit('B', 'same')], events, 2_000);
    const news = newsSince(before, after, now, events);
    expect(news.since).toBe(1_000);
    expect(news.newCharacters.map((e) => e.id)).toEqual(['M1', 'M2', 'M3']);
    expect(news.reworked.map((e) => e.id)).toEqual(['A']);
    expect(news.newEvents.map((e) => e.id)).toEqual(['e2']);
    expect(news.newTeams.map((x) => x.id)).toEqual(['Menace']);
    expect(isEmptyNews(newsSince(after, after, now, events))).toBe(true);
  });

  it('does not call every kit a rework when the earlier visit had no kits', () => {
    const before = snapshotOf(base, [], [], 1_000);
    const after = snapshotOf(base, [kit('A', 'x')], [], 2_000);
    expect(newsSince(before, after, base, []).reworked).toEqual([]);
  });
});
