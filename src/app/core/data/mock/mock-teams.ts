import { TeamOrder, TeamTab } from '../../models';

const t = (total: number, ...squad: string[]): TeamOrder => ({ squad, total });

const AVENGERS = ['CaptainAmerica', 'IronMan', 'Thor', 'BlackWidow', 'Hulk'];
const SPIDER = ['SpiderMan', 'MilesMorales', 'GhostSpider', 'Wolverine', 'Storm'];
const XMEN = ['Phoenix', 'Cyclops', 'Storm', 'Wolverine', 'Magneto'];
const GUARDIANS = ['StarLord', 'Rocket', 'Groot', 'Drax', 'Mantis'];
const VILLAINS = ['DoctorDoom', 'Loki', 'Thanos', 'Magneto', 'BlackWidow'];
/** Characters the mock player has never heard of — must be hidden. */
const UNKNOWN = ['Gambit', 'Rogue', 'Kestrel', 'Psylocke', 'Phoenix'];

/** Shape of GET /game/v1/analysis/teamOrder/{tab}. Same squads in other orders get merged. */
export const MOCK_TEAM_ORDER: Partial<Record<TeamTab, TeamOrder[]>> = {
  arena: [
    t(18_400, ...XMEN),
    t(6_100, 'Storm', 'Phoenix', 'Cyclops', 'Wolverine', 'Magneto'),
    t(15_900, ...UNKNOWN),
    t(12_300, ...SPIDER),
    t(7_800, ...VILLAINS),
    t(4_200, ...AVENGERS),
  ],
  war: [
    t(21_000, ...SPIDER),
    t(14_700, ...UNKNOWN),
    t(11_200, ...AVENGERS),
    t(5_600, ...GUARDIANS),
  ],
  raids: [t(30_500, ...GUARDIANS), t(22_100, ...AVENGERS), t(9_800, ...XMEN)],
  blitz: [t(8_800, ...AVENGERS), t(8_100, ...SPIDER), t(6_500, ...VILLAINS)],
  tower: [t(5_400, ...GUARDIANS), t(4_900, ...XMEN)],
  crucible: [t(16_300, ...XMEN), t(13_900, ...UNKNOWN), t(9_200, ...SPIDER)],
};
