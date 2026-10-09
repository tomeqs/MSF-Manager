import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [DatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Query params. */
  readonly returnUrl = input<string>();
  readonly expired = input<string>();

  protected readonly redirecting = signal(false);
  protected readonly lastEnd = this.auth.lastSessionEnd;

  protected login(): void {
    this.redirecting.set(true);
    void this.auth.login(this.target());
  }

  protected demo(): void {
    this.auth.startDemo();
    void this.router.navigateByUrl(this.target());
  }

  /** Only allow in-app paths as return targets. */
  private target(): string {
    const url = this.returnUrl();
    return url?.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login')
      ? url
      : '/dashboard';
  }
}
