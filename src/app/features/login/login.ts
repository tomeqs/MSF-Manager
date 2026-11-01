import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input, signal } from '@angular/core';
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
  private readonly document = inject(DOCUMENT);

  /** Query params. */
  readonly returnUrl = input<string>();
  readonly expired = input<string>();

  protected readonly redirecting = signal(false);
  protected readonly lastEnd = this.auth.lastSessionEnd;

  protected login(): void {
    this.redirecting.set(true);
    void this.auth.login(this.target());
  }

  /**
   * Full page load into demo mode: stores still holding an expired session's account data
   * must not show it as the demo (or mix demo goals into it).
   */
  protected demo(): void {
    this.auth.startDemo();
    this.document.location.assign(this.target());
  }

  /** Only allow in-app paths as return targets. */
  private target(): string {
    const url = this.returnUrl();
    return url?.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login')
      ? url
      : '/dashboard';
  }
}
