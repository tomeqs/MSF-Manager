import { SquadsInfo } from '../../models';

const SYMBIOTES = ['QuicksilverSymbiote', 'Riot', 'Toxin', 'ProfessorX', 'Knull'];
const SPIDER = ['SpiderMan', 'MilesMorales', 'GhostSpider', 'Wolverine', 'Storm'];
const AVENGERS = ['CaptainAmerica', 'IronMan', 'Thor', 'BlackWidow', 'Hulk'];
const XMEN = ['Phoenix', 'Cyclops', 'Storm', 'Wolverine', 'Magneto'];

/**
 * Shape of GET /player/v1/squads. The demo player saved a mix: meta squads, a nearly-meta one
 * with two odd members, and improvised ones — so the view has something to suggest.
 */
export const MOCK_SQUADS: SquadsInfo = {
  maxSquads: 40,
  tabs: {
    arena: [['QuicksilverSymbiote', 'Riot', 'Knull', 'SpiderMan', 'IronMan']],
    war: [SPIDER, AVENGERS, SYMBIOTES],
    raids: [
      ['CaptainAmerica', 'IronMan', 'Thor', 'BlackWidow', 'Thanos'],
      ['SpiderWomanJulia', 'RachelColeAlves', 'SpiderMan', 'Hulk', 'Magneto'],
    ],
    blitz: [AVENGERS, SPIDER],
    tower: [],
    crucible: [XMEN, ['Phoenix', 'OmegaRedPF', 'Toxin', 'Executioner', 'Loki']],
    roster: [],
  },
};
