import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-interview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="feature-page">
      <h1>Interview</h1>
      <p>Interview preparation for students with Allowed Interview access.</p>
    </section>
  `,
  styles: `
    .feature-page {
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 24px;
    }
    h1 {
      margin: 0 0 8px;
      color: var(--navy);
    }
    p {
      margin: 0;
      color: var(--muted);
    }
  `
})
export class Interview {}
