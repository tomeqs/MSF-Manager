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
        path: 'teams',
        title: 'Drużyny · MSF Assistant',
        loadComponent: () => import('./features/teams/teams').then((m) => m.Teams),
      },
      {
        path: 'farming',
        title: 'Farmienie · MSF Assistant',
        loadComponent: () => import('./features/farming/farming').then((m) => m.Farming),
      },
      {
        path: 'alliance',
        title: 'Sojusz · MSF Assistant',
        data: { heading: 'Sojusz', description: 'Członkowie sojuszu i ich rostery.' },
        loadComponent: () => import('./features/coming-soon/coming-soon').then((m) => m.ComingSoon),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
