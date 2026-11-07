import { RosterEntry } from '../../../core/models';
import { Substitute, TeamFit, Verdict } from '../../../core/state/war-plan';
import { linkText } from '../squad-labels';

export const VERDICT_LABELS: Record<Verdict, string> = {
  ready: 'Gotowa',
  develop: 'Do rozwoju',
  substitute: 'Z zamiennikiem',
  far: 'Daleko',
};

/** One line on how the player stands with a team. */
export function verdictText(fit: TeamFit): string {
  const owned = fit.slots.filter((s) => s.state === 'ready' || s.state === 'weak').length;
  switch (fit.verdict) {
    case 'ready':
      return 'Masz cały skład gotowy do walki.';
    case 'develop':
      return 'Masz wszystkich, część trzeba jeszcze rozwinąć.';
    case 'substitute':
      return `Masz ${owned} z ${fit.slots.length} — złożysz ją teraz z zamiennikiem.`;
    case 'far':
      return fit.slots.length
        ? `Masz ${owned} z ${fit.slots.length} — za mało, by grać nią teraz.`
        : 'Nie ma jej postaci w danych gry.';
  }
}

/** Why a substitute fits: role, kit or trait link, plug-and-play, readiness. */
export function substituteReasons(sub: Substitute, nameOf: (id: string) => string): string {
  const parts: string[] = [];
  if (sub.role) parts.push(`ta sama rola (${sub.role})`);
  if (sub.link) parts.push(linkText(sub.link, nameOf));
  if (sub.key) parts.push('plug-and-play w Wojnie');
  if (sub.needs.length) parts.push(`do rozwoju: ${sub.needs[0].text}`);
  return parts.join('; ') || 'najsilniejszy z wolnych';
}

export function names(entries: RosterEntry[]): string {
  return entries.map((e) => e.name).join(', ');
}
