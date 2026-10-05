import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/** OAuth2 redirect target (`/auth/callback`): exchanges the code for tokens. */
@Component({
  selector: 'app-auth-callback',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="card box">
      @if (error(); as message) {
        <h1>Logowanie nie powiodło się</h1>
        <p class="muted">{{ message }}</p>
        <a routerLink="/login">← Wróć do logowania</a>
      } @else {
        <p>Logowanie…</p>
      }
    </main>
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: 16px;
    }
    .box {
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    h1 {
      font-size: 1.2rem;
    }
    p {
      margin: 0;
    }
  `,
})
export class AuthCallback implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    try {
      const returnUrl = await this.auth.completeLogin({
        code: params.get('code'),
        state: params.get('state'),
        error: params.get('error'),
        error_description: params.get('error_description'),
      });
      await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    } catch (e) {
      this.error.set(describe(e));
    }
  }
}

function describe(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const detail = error.error?.error_description ?? error.error?.error;
    return detail
      ? `Serwer logowania odrzucił żądanie: ${detail}`
      : `Błąd połączenia z serwerem logowania (HTTP ${error.status}).`;
  }
  return error instanceof Error ? error.message : 'Nieznany błąd.';
}
