import { CharacterSource } from '../data/character-sources';
import { EventInfo, RosterEntry, ShardDrops } from '../models';
import { autoSourceIndex, withAutoSources } from './auto-sources';
import { toRosterEntry } from './roster.mapper';

const entry = (id: string): RosterEntry => ({
  ...toRosterEntry({ id, name: id }),
  shardItemId: `SHARD_${id}`,
});
const roster = ['Node', 'Mystic', 'Orb', 'Paid'].map(entry);
const drops: ShardDrops = {
  nodes: [
    {
      itemId: 'SHARD_Node',
      episodicType: 'campaign',
      episodicId: 'Heroes',
      node: 'HEROES 4-3',
      kind: 'rewards',
      amount: 1,
      random: true,
    },
    {
      itemId: 'SHARD_Mystic',
      episodicType: 'eventCampaign',
      episodicId: 'Mystic',
      node: 'MYSTIC 1-5',
      kind: 'limited',
      amount: 5,
      random: false,
    },
  ],
  orbs: [{ itemId: 'SHARD_Orb', orbId: 'Orb_X', orbName: 'X Orb', amount: 15 }],
};
const mysticEvent = (startTime: number): EventInfo => ({
  id: 'mystic',
  type: 'episodic',
  name: 'Mystic Mayhem',
  startTime,
  endTime: 2_000_000_000,
  episodic: { type: 'eventCampaign', ids: ['Mystic'] },
});
const researched = (name: string, status: CharacterSource['status']): CharacterSource => ({
  name,
  teams: '',
  status,
  source: 'badania',
  confidence: 'OFF',
});

describe('automatic shard sources', () => {
  it('turns node drops, event campaigns and orbs into sources per character', () => {
    const index = autoSourceIndex(roster, drops, new Map(), [mysticEvent(0)], 1_000);
    expect(index.get('Node')).toEqual([expect.objectContaining({ kind: 'node', live: true })]);
    expect(index.get('Mystic')).toEqual([
      expect.objectContaining({
        kind: 'eventNode',
        live: true,
        label: expect.stringContaining('Mystic Mayhem'),
      }),
    ]);
    expect(index.get('Orb')?.[0].kind).toBe('orb');
    // An event campaign with no event running or scheduled is not a source.
    expect(autoSourceIndex(roster, drops, new Map(), [], 1_000).has('Mystic')).toBe(false);
    // A scheduled one is shown, but not as open.
    const later = autoSourceIndex(roster, drops, new Map(), [mysticEvent(5_000)], 1_000);
    expect(later.get('Mystic')?.[0].live).toBe(false);
  });

  it('lets game data correct the research: replace the unknown, keep the cheaper', () => {
    const index = autoSourceIndex(roster, drops, new Map(), [mysticEvent(0)], 1_000);
    const merged = (id: string, manual?: CharacterSource) =>
      withAutoSources(manual, index.get(id) ?? [], entry(id));

    expect(merged('Node', researched('Node', 'unknown'))).toMatchObject({
      status: 'permanent',
      confidence: 'API',
    });
    expect(merged('Node', researched('Node', 'event'))?.status).toBe('event'); // cheaper stays
    expect(merged('Mystic', researched('Mystic', 'endgame'))).toMatchObject({
      status: 'event',
      afterUntil: 'endgame',
    });
    expect(merged('Orb', researched('Orb', 'paid'))?.status).toBe('orb');
    expect(merged('Orb', researched('Orb', 'permanent'))?.status).toBe('permanent');
    expect(merged('Paid', researched('Paid', 'paid'))?.status).toBe('paid'); // nothing found
    expect(merged('Node')).toMatchObject({ name: 'Node', status: 'permanent' });
  });
});
