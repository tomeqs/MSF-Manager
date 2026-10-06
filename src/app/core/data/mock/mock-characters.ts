import { CharacterInfo, TraitObject } from '../../models';

const t = (id: string, name = id): TraitObject => ({ id, name });

const HERO = t('Hero');
const VILLAIN = t('Villain');
const BIO = t('Bio');
const MUTANT = t('Mutant');
const MYSTIC = t('Mystic');
const SKILL = t('Skill');
const TECH = t('Tech');
const BLASTER = t('Blaster');
const BRAWLER = t('Brawler');
const CONTROLLER = t('Controller');
const PROTECTOR = t('Protector');
const SUPPORT = t('Support');
const AVENGER = t('Avenger');
const XMEN = t('Xmen', 'X-Men');
const SPIDER = t('SpiderVerse', 'Spider-Verse');
const WAKANDA = t('Wakandan');
const GUARDIANS = t('Guardian', 'Guardians');
const ASGARD = t('Asgardian');

const c = (id: string, name: string, traits: TraitObject[]): CharacterInfo => ({
  id,
  name,
  status: 'playable',
  traits,
  starItems: [`SHARD_${id}`],
  unlockStars: 3,
});

/** Shape of GET /game/v1/characters?status=playable&charInfo=full (subset). */
export const MOCK_CHARACTERS: CharacterInfo[] = [
  c('CaptainAmerica', 'Captain America', [HERO, BIO, PROTECTOR, AVENGER]),
  c('IronMan', 'Iron Man', [HERO, TECH, BLASTER, AVENGER]),
  c('Thor', 'Thor', [HERO, MYSTIC, BRAWLER, AVENGER, ASGARD]),
  c('BlackWidow', 'Black Widow', [HERO, SKILL, CONTROLLER, AVENGER]),
  c('Hulk', 'Hulk', [HERO, BIO, BRAWLER, AVENGER]),
  c('SpiderMan', 'Spider-Man', [HERO, BIO, BRAWLER, SPIDER]),
  c('MilesMorales', 'Spider-Man (Miles)', [HERO, BIO, BRAWLER, SPIDER]),
  c('GhostSpider', 'Ghost-Spider', [HERO, BIO, CONTROLLER, SPIDER]),
  c('Wolverine', 'Wolverine', [HERO, MUTANT, BRAWLER, XMEN]),
  c('Storm', 'Storm', [HERO, MUTANT, BLASTER, XMEN]),
  c('Cyclops', 'Cyclops', [HERO, MUTANT, BLASTER, XMEN]),
  c('Phoenix', 'Phoenix', [HERO, MUTANT, CONTROLLER, XMEN]),
  c('BlackPanther', 'Black Panther', [HERO, BIO, BRAWLER, WAKANDA]),
  c('Shuri', 'Shuri', [HERO, TECH, SUPPORT, WAKANDA]),
  c('Okoye', 'Okoye', [HERO, SKILL, PROTECTOR, WAKANDA]),
  c('StarLord', 'Star-Lord', [HERO, SKILL, BLASTER, GUARDIANS]),
  c('Rocket', 'Rocket Raccoon', [HERO, TECH, BLASTER, GUARDIANS]),
  c('Groot', 'Groot', [HERO, BIO, PROTECTOR, GUARDIANS]),
  c('Drax', 'Drax', [HERO, BIO, BRAWLER, GUARDIANS]),
  c('Mantis', 'Mantis', [HERO, MYSTIC, SUPPORT, GUARDIANS]),
  c('Magneto', 'Magneto', [VILLAIN, MUTANT, CONTROLLER]),
  c('Loki', 'Loki', [VILLAIN, MYSTIC, CONTROLLER, ASGARD]),
  c('Thanos', 'Thanos', [VILLAIN, BIO, BRAWLER]),
  c('DoctorDoom', 'Doctor Doom', [VILLAIN, MYSTIC, CONTROLLER]),
  c('ProfessorX', 'Professor Xavier', [HERO, MUTANT, CONTROLLER, XMEN]),
  c('Knull', 'Knull', [VILLAIN, MYSTIC, BRAWLER]),
  c('Mephisto', 'Mephisto', [VILLAIN, MYSTIC, CONTROLLER]),
  c('Odin', 'Odin', [HERO, MYSTIC, PROTECTOR, ASGARD]),
  c('BlueMarvel', 'Blue Marvel', [HERO, BIO, BLASTER]),
];
