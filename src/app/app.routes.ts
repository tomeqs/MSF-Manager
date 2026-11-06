import { Routes } from '@angular/router';
import { sessionGuard } from './core/auth/session.guard';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Logowanie · MSF Assistant',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    // OAuth2 redirect registered in the MSF Developer Portal.
    path: 'auth/callback',
    title: 'Logowanie · MSF Assistant',
    loadComponent: () =>
      import('./features/auth-callback/auth-callback').then((m) => m.AuthCallback),
  },
  {
    path: '',
    component: Shell,
    canActivate: [sessionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Pulpit · MSF Assistant',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'roster',
        title: 'Roster · MSF Assistant',
        loadComponent: () => import('./features/roster/roster').then((m) => m.Roster),
      },
      {
        path: 'roster/:id',
        title: 'Postać · MSF Assistant',
        loadComponent: () =>
          import('./features/character-detail/character-detail').then((m) => m.CharacterDetail),
      },
      {
        path: 'events',
        title: 'Eventy · MSF Assistant',
        loadComponent: () => import('./features/events/events').then((m) => m.Events),
      },
      {
        // Składy: the squad assistant, the teams of the roster and the meta teams per mode.
        path: 'squads',
        loadComponent: () => import('./layout/section/section').then((m) => m.Section),
        data: {
          tabs: [
            { path: '/squads', label: 'Asystent' },
            { path: '/squads/roster', label: 'Drużyny z rosteru' },
            { path: '/squads/meta', label: 'Drużyny z mety' },
          ],
        },
        children: [
          {
            path: '',
            title: 'Składy · MSF Assistant',
            loadComponent: () => import('./features/squads/squads').then((m) => m.Squads),
          },
          {
            path: 'roster',
            title: 'Drużyny z rosteru · MSF Assistant',
            loadComponent: () =>
              import('./features/squads/roster-teams/roster-teams').then((m) => m.RosterTeams),
          },
          {
            path: 'meta',
            title: 'Drużyny z mety · MSF Assistant',
            loadComponent: () => import('./features/teams/teams').then((m) => m.Teams),
          },
        ],
      },
      {
        // Rozwój: what to farm, key characters and the roster analysis.
        path: 'farming',
        loadComponent: () => import('./layout/section/section').then((m) => m.Section),
        data: {
          tabs: [
            { path: '/farming', label: 'Farmienie' },
            { path: '/farming/key', label: 'Kluczowe postacie' },
            { path: '/farming/analysis', label: 'Analiza' },
          ],
        },
        children: [
          {
            path: '',
            title: 'Farmienie · MSF Assistant',
            loadComponent: () => import('./features/farming/farming').then((m) => m.Farming),
          },
          {
            path: 'key',
            title: 'Kluczowe postacie · MSF Assistant',
            loadComponent: () =>
              import('./features/key-characters/key-characters').then((m) => m.KeyCharacters),
          },
          {
            path: 'analysis',
            title: 'Analiza · MSF Assistant',
            loadComponent: () => import('./features/analysis/analysis').then((m) => m.Analysis),
          },
        ],
      },
      // Old addresses (bookmarks, earlier links).
      { path: 'teams', redirectTo: 'squads/meta' },
      { path: 'key-characters', redirectTo: 'farming/key' },
      { path: 'analysis', redirectTo: 'farming/analysis' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
