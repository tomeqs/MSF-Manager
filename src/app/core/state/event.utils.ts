import { EventInfo, EventType, Progress } from '../models';

export const EVENT_TYPE_LABELS: Partial<Record<EventType, string>> = {
  milestone: 'Milestone',
  blitz: 'Blitz',
  tower: 'Wieża',
  raid: 'Raid',
  raidSeason: 'Sezon raidów',
  warSeason: 'Sezon wojen',
  episodic: 'Kampania',
  pickYourPoison: 'Pick Your Poison',
  battlePass: 'Battle Pass',
  strikePass: 'Strike Pass',
  bonus: 'Bonus',
  donation: 'Donacje',
  info: 'Info',
};

/** First bracket's progress, wherever the event type keeps it. */
export function eventProgress(event: EventInfo): Progress | undefined {
  const holder = event.milestone ?? event.blitz ?? event.tower;
  return holder?.brackets?.[0]?.objective?.progress;
}

/** Human-readable "2d 5h" / "3h 12m" until `target` (seconds since epoch). */
export function formatTimeLeft(target: number, nowMs = Date.now()): string {
  const seconds = Math.max(0, Math.floor(target - nowMs / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
