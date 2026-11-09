import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { InterviewTemplate, InterviewTemplateKind } from '../models';
import { InterviewCatalogService, interviewErrorMessage } from './interview-catalog.service';
import { InterviewQuota, InterviewService } from './interview.service';

interface CatalogGroup {
  kind: InterviewTemplateKind;
  label: string;
  templates: InterviewTemplate[];
}

const ACTIVE_SESSION_KEY = 'ulearn.interview.activeSessionId';

@Component({
  selector: 'app-interview',
  template: `
    <section class="feature-page">
      <header class="page-header">
        <div>
          <h1>Interview Practice</h1>
          <p>Practice with the available interview templates.</p>
        </div>
      </header>

      @if (quotaLoading()) {
        <div class="banner">Checking your weekly quota...</div>
      }

      @if (quotaError()) {
        <div class="banner error" role="alert">
          <p>{{ quotaError() }}</p>
        </div>
      }

      @if (quota()) {
        <section class="quota-card">
          <div>
            <span class="eyebrow">Weekly quota</span>
            <h2>Mock interviews</h2>
            <p>Your weekly interview allowance is enforced when a session starts.</p>
          </div>

          @if (quotaExhausted()) {
            <div class="quota-warning" role="status">
              Your weekly mock interview quota has been reached.
            </div>
          }

          @if (activeSessionId()) {
            <button
              type="button"
              class="secondary-button"
              [disabled]="starting()"
              (click)="resumeSession()">
              {{ starting() ? 'Opening...' : 'Resume interview' }}
            </button>
          }
        </section>
      }

      <section class="catalog">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Interview catalog</span>
            <h2>Choose an interview</h2>
          </div>

          <button
            type="button"
            class="secondary-button"
            [disabled]="loading()"
            (click)="load()">
            {{ loading() ? 'Loading...' : 'Refresh' }}
          </button>
        </div>

        @if (loadError()) {
          <div class="banner error" role="alert">
            <p>{{ loadError() }}</p>
          </div>
        }

        @if (startError()) {
          <div class="banner error" role="alert">
            <p>{{ startMessage() }}</p>
          </div>
        }

        @if (!loading() && !loadError() && templates().length === 0) {
          <div class="empty-state">
            <h3>No interviews available</h3>
            <p>There are no published interview templates available right now.</p>
          </div>
        }

        @for (group of groups(); track group.kind) {
          <section class="template-group">
            <h3>{{ group.label }}</h3>

            <div class="template-grid">
              @for (template of group.templates; track template.id) {
                <article class="template-card">
                  <div class="template-content">
                    <span class="template-kind">{{ group.label }}</span>
                    <h4>{{ template.title }}</h4>

                    @if (template.description) {
                      <p>{{ template.description }}</p>
                    }
                  </div>

                  <button
                    type="button"
                    class="primary-button"
                    [disabled]="startingId() !== null || quotaExhausted()"
                    (click)="start(template)">
                    {{ startingId() === template.id ? 'Starting...' : 'Start interview' }}
                  </button>
                </article>
              }
            </div>
          </section>
        }
      </section>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .feature-page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }

    .page-header,
    .section-heading,
    .quota-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }

    .page-header {
      margin-bottom: 24px;
    }

    h1,
    h2,
    h3,
    h4,
    p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 8px;
    }

    .page-header p,
    .template-content p,
    .quota-card p {
      margin-bottom: 0;
      opacity: 0.75;
    }

    .eyebrow {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.65;
    }

    .quota-card {
      margin-bottom: 36px;
      padding: 22px;
      border: 1px solid #e3e3e3;
      border-radius: 14px;
    }

    .quota-warning {
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 600;
    }

    .catalog {
      margin-top: 24px;
    }

    .section-heading {
      margin-bottom: 20px;
    }

    .template-group {
      margin-bottom: 32px;
    }

    .template-group > h3 {
      margin-bottom: 14px;
    }

    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    .template-card {
      display: flex;
      min-height: 190px;
      flex-direction: column;
      justify-content: space-between;
      gap: 20px;
      padding: 20px;
      border: 1px solid #e3e3e3;
      border-radius: 14px;
    }

    .template-kind {
      display: inline-block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      opacity: 0.65;
    }

    .template-card h4 {
      margin-bottom: 8px;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 10px 16px;
      cursor: pointer;
      font: inherit;
      font-weight: 600;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .primary-button {
      align-self: flex-start;
    }

    .secondary-button {
      white-space: nowrap;
    }

    .banner,
    .empty-state {
      margin: 16px 0;
      padding: 16px;
      border-radius: 10px;
      border: 1px solid #e3e3e3;
    }

    .banner.error {
      border-color: #d88;
    }

    .empty-state {
      text-align: center;
    }

    @media (max-width: 700px) {
      .page-header,
      .section-heading,
      .quota-card {
        align-items: flex-start;
        flex-direction: column;
      }

      .feature-page {
        padding: 24px 16px 40px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Interview implements OnInit {
  private readonly catalog = inject(InterviewCatalogService);
  private readonly interviewService = inject(InterviewService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly templates = signal<InterviewTemplate[]>([]);
  readonly startingId = signal<string | null>(null);

  readonly quotaLoading = signal(true);
  readonly quotaError = signal<string | null>(null);
  readonly quota = signal<InterviewQuota | null>(null);
  readonly quotaExhausted = signal(false);

  readonly starting = signal(false);
  readonly startError = signal(false);
  readonly startMessage = signal<string | null>(null);
  readonly activeSessionId = signal<string | null>(this.readStoredSessionId());

  readonly groups = computed<CatalogGroup[]>(() => {
    const templates = this.templates();

    const groups: CatalogGroup[] = [
      {
        kind: InterviewTemplateKind.Technical,
        label: 'Technical',
        templates: templates.filter(t => t.kind === InterviewTemplateKind.Technical)
      },
      {
        kind: InterviewTemplateKind.Behavioral,
        label: 'Behavioral',
        templates: templates.filter(t => t.kind === InterviewTemplateKind.Behavioral)
      },
      {
        kind: InterviewTemplateKind.Mixed,
        label: 'Mixed',
        templates: templates.filter(t => t.kind === InterviewTemplateKind.Mixed)
      }
    ];

    return groups.filter(group => group.templates.length > 0);
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.refreshQuota(),
      this.load()
    ]);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const templates = await this.catalog.listPublishedTemplates();
      this.templates.set(templates);
    } catch (error) {
      this.loadError.set(interviewErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async start(template: InterviewTemplate): Promise<void> {
    if (this.startingId() !== null || this.quotaExhausted()) {
      return;
    }

    this.startingId.set(template.id);
    this.startError.set(false);
    this.startMessage.set(null);

    try {
      const sessionId = await this.catalog.startSession(template);

      this.storeSessionId(sessionId);
      this.activeSessionId.set(sessionId);

      await this.router.navigate(['/interview/session', sessionId]);
    } catch (error) {
      this.startError.set(true);
      this.startMessage.set(interviewErrorMessage(error));
      await this.refreshQuota();
    } finally {
      this.startingId.set(null);
    }
  }

  async resumeSession(): Promise<void> {
    const sessionId = this.activeSessionId();

    if (!sessionId || this.starting()) {
      return;
    }

    this.starting.set(true);
    this.startError.set(false);
    this.startMessage.set(null);

    try {
      const outcome = await this.interviewService.startInterview({
        resumeSessionId: sessionId
      });

      if (!outcome.sessionId) {
        throw new Error('Unable to resume the interview session.');
      }

      this.storeSessionId(outcome.sessionId);
      this.activeSessionId.set(outcome.sessionId);

      await this.router.navigate(['/interview/session', outcome.sessionId]);
    } catch (error) {
      this.startError.set(true);
      this.startMessage.set(interviewErrorMessage(error));

      const message = interviewErrorMessage(error).toLowerCase();
      if (message.includes('not resumable') || message.includes('not found')) {
        this.clearStoredSessionId();
        this.activeSessionId.set(null);
      }

      await this.refreshQuota();
    } finally {
      this.starting.set(false);
    }
  }

  private async refreshQuota(): Promise<void> {
    this.quotaLoading.set(true);
    this.quotaError.set(null);

    try {
      const result = await this.interviewService.loadQuota();
      this.quota.set(result);
      this.quotaExhausted.set(
        Number(result.remaining ?? 0) <= 0
      );
    } catch (error) {
      this.quota.set(null);
      this.quotaExhausted.set(false);
      this.quotaError.set(interviewErrorMessage(error));
    } finally {
      this.quotaLoading.set(false);
    }
  }

  private readStoredSessionId(): string | null {
    try {
      return sessionStorage.getItem(ACTIVE_SESSION_KEY);
    } catch {
      return null;
    }
  }

  private storeSessionId(sessionId: string): void {
    try {
      sessionStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    } catch {
      // Storage can be unavailable; navigation still works.
    }
  }

  private clearStoredSessionId(): void {
    try {
      sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      // Storage can be unavailable.
    }
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    // Intentionally do not clear an active session here.
    // The student may return and resume it.
  }
}
