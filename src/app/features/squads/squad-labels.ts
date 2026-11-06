import { AbilityKey, TeamTab } from '../../core/models';
import { SquadOption, SquadOrigin } from '../../core/state/squads';
import { SynergyLink } from '../../core/state/synergy';

export const MODE_LABELS: Record<TeamTab, string> = {
  arena: 'Arena',
  war: 'Wojna',
  raids: 'Raidy',
  blitz: 'Blitz',
  tower: 'Wieża',
  crucible: 'Crucible',
  roster: 'Roster',
};

export const ORIGIN_LABELS: Record<SquadOrigin, string> = {
  meta: 'z mety',
  community: 'popularny',
  saved: 'zapisany u Ciebie',
  synergy: 'z synergii',
};

export const ORDER_LABELS: Record<SquadOption['order'], string> = {
  community: 'Kolejność jak u większości graczy',
  saved: 'Twoja kolejność z gry',
  meta: 'Kolejność z poradnika',
  synergy: 'Kolejność dowolna',
};

const ABILITY_LABELS: Record<AbilityKey, string> = {
  passive: 'pasywka',
  ultimate: 'ultimate',
  special: 'special',
  basic: 'basic',
};

/** "Riot → Toxin: wzmacnia Symbiote (pasywka)" */
export function linkText(link: SynergyLink, nameOf: (id: string) => string): string {
  const from = nameOf(link.from);
  const to = nameOf(link.to);
  const ability = link.ability ? ` (${ABILITY_LABELS[link.ability]})` : '';
  switch (link.kind) {
    case 'trait':
      return `${from} → ${to}: wzmacnia ${link.via}${ability}`;
    case 'name':
      return `${from} → ${to}: wymieniona wprost${ability}`;
    case 'shared':
      return `${from} + ${to}: wspólna cecha ${link.via}`;
  }
}

/** Known team name, else what the squad is. */
export function squadTitle(option: SquadOption): string {
  if (option.name) return option.name;
  if (option.origins.includes('community')) return 'Popularny skład graczy';
  if (option.origins.includes('saved')) return 'Twój skład';
  return 'Skład z synergii';
}
