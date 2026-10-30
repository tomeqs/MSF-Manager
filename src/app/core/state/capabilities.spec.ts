import { CharacterKit, RosterEntry } from '../models';
import { capabilitiesOf, rosterCoverage, squadProfile } from './capabilities';
import { toRosterEntry } from './roster.mapper';

const kit = (id: string, special: string, passive = ''): CharacterKit => ({
  id,
  traits: [],
  texts: { special, passive },
});
const entry = (id: string, power = 1): RosterEntry =>
  toRosterEntry({ id, name: id }, { id, level: 90, power, activeYellow: 7 });

const kits = new Map([
  ['Tank', kit('Tank', 'Gain <b>Taunt</b> and Deflect.')],
  ['Medic', kit('Medic', 'Heal all allies and Cleanse 1 negative effect.')],
  ['Nuker', kit('Nuker', 'Attack all enemies. Apply Ability Block.', 'Gain Speed Up.')],
]);
const kitOf = (id: string) => kits.get(id);

describe('capabilities', () => {
  it('reads mechanics from the words of the kit', () => {
    expect(capabilitiesOf(kits.get('Tank'))).toEqual(['taunt']);
    expect(capabilitiesOf(kits.get('Medic'))).toEqual(['heal', 'cleanse']);
    // "Speed Up" is not "Speed Bar"; words across abilities never join into a phrase.
    expect(capabilitiesOf(kits.get('Nuker'))).toEqual(['abilityBlock', 'aoe']);
    expect(capabilitiesOf(undefined)).toEqual([]);
  });

  it('shows who brings what in a squad and which essentials are missing', () => {
    const profile = squadProfile([entry('Tank'), entry('Nuker')], kitOf);
    expect(profile.present.map((p) => [p.id, p.by])).toEqual([
      ['taunt', ['Tank']],
      ['abilityBlock', ['Nuker']],
      ['aoe', ['Nuker']],
    ]);
    expect(profile.gaps).toEqual(['sustain', 'cleanse']);
    expect(squadProfile([entry('Tank'), entry('Medic')], kitOf).gaps).toEqual([]);
  });

  it('counts mechanics across the roster, rarest first', () => {
    const coverage = rosterCoverage([entry('Tank', 5), entry('Medic', 9), entry('Nuker')], kitOf);
    const heal = coverage.find((c) => c.id === 'heal')!;
    expect(heal.characters.map((e) => e.id)).toEqual(['Medic']);
    expect(coverage[0].characters).toEqual([]); // e.g. nobody revives
  });
});
