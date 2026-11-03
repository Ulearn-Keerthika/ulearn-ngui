import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { InterviewQuota, InterviewService } from './interview.service';

const ACTIVE_SESSION_KEY = 'ulearn.interview.activeSessionId';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { InterviewTemplate, InterviewTemplateKind } from '../models';
import { InterviewCatalogService, interviewErrorMessage } from './interview-catalog.service';

interface CatalogGroup {
  kind: InterviewTemplateKind;
  label: string;
  description: string;
  templates: InterviewTemplate[];
}

const KIND_COPY: Record<InterviewTemplateKind, { label: string; description: string }> = {
  hr: {
    label: 'HR',
    description:
      'Behavioral questions about teamwork, communication, challenges, and how you make decisions.',
  },
  technical: {
    label: 'Technical',
    description:
      'Programming, data structures, algorithms, and how you explain a technical solution.',
  },
  domain: {
    label: 'Domain',
    description: 'Questions focused on a specific subject area.',
  },
};

const KIND_ORDER: readonly InterviewTemplateKind[] = ['hr', 'technical', 'domain'];

@Component({
  selector: 'app-interview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="feature-page">
      <header class="page-header">
        <h1>Mock interview</h1>
        <p>Practice interviews with a weekly session limit to keep usage fair.</p>
      </header>

      @if (loading()) {
        <p class="status" role="status">Loading your weekly quota…</p>
      } @else if (error()) {
        <div class="banner banner--error" role="alert">
          <p>{{ error() }}</p>
          <button type="button" class="btn btn--secondary" (click)="refreshQuota()">
            Try again
          </button>
        </div>
      } @else if (quota()) {
        <div class="quota-card">
          <h2>This week</h2>
          <dl class="quota-stats">
            <div>
              <dt>Attempts used</dt>
              <dd>{{ quota()!.used }} / {{ quota()!.weekly_limit }}</dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>{{ quota()!.remaining }}</dd>
            </div>
            <div>
              <dt>Resets</dt>
              <dd>{{ formatReset(quota()!.resets_at) }}</dd>
            </div>
          </dl>

          @if (quotaExhausted()) {
            <div class="banner banner--warn" role="status">
              You have used all {{ quota()!.weekly_limit }} mock interviews for this week.
              Your quota resets {{ formatReset(quota()!.resets_at) }}.
            </div>
          }

          @if (activeSessionId()) {
            <p class="session-note">
              Active session:
              <code>{{ activeSessionId() }}</code>
            </p>
          }

          <div class="actions">
            <button
              type="button"
              class="btn btn--primary"
              [disabled]="starting() || quotaExhausted()"
              (click)="startNewSession()"
            >
              @if (starting()) {
                Starting…
              } @else {
                Start interview
              }
            </button>

            @if (activeSessionId()) {
              <button
                type="button"
                class="btn btn--secondary"
                [disabled]="starting()"
                (click)="resumeSession()"
              >
                Resume session
              </button>
            }
          </div>

          @if (startMessage()) {
            <p class="status" [class.status--error]="startError()">{{ startMessage() }}</p>
          }
        </div>
      }
    </section>
    <div class="interview-page">
      <header class="page-header">
        <h1>Interview</h1>
        <p>Choose a published interview and start a new session.</p>
      </header>

      @if (loading()) {
        <p class="status" role="status">Loading interviews…</p>
      } @else if (loadError()) {
        <div class="banner error" role="alert">
          <p>{{ loadError() }}</p>
          <button type="button" class="btn-outline" (click)="load()">Try again</button>
        </div>
      } @else if (groups().length === 0) {
        <p class="status">No published interviews are available yet.</p>
      } @else {
        @if (startError()) {
          <div class="banner error" role="alert">
            <p>{{ startError() }}</p>
          </div>
        }

        @for (group of groups(); track group.kind) {
          <section class="group" [attr.aria-labelledby]="'interview-group-' + group.kind">
            <h2 [id]="'interview-group-' + group.kind">{{ group.label }}</h2>
            <div class="cards">
              @for (template of group.templates; track template.id) {
                <article class="card">
                  <p class="kind">{{ group.label }}</p>
                  <h3>{{ template.title }}</h3>
                  <p class="description">{{ group.description }}</p>
                  <p class="meta">{{ template.durationMinutes }} minutes</p>
                  <button
                    type="button"
                    class="btn-primary"
                    [disabled]="startingId() !== null"
                    (click)="start(template)"
                  >
                    {{ startingId() === template.id ? 'Starting…' : 'Start' }}
                  </button>
                </article>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .interview-page {
      max-width: 960px;
      margin: 0 auto;
      padding: 48px 24px 72px;
    }
    .page-header h1 {
      margin: 0 0 8px;
      color: var(--navy);
      font-family: 'Poppins', sans-serif;
    }
    .page-header p {
      margin: 0;
      color: var(--muted);
    }
    .quota-card {
      margin-top: 32px;
      padding: 24px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      background: var(--surface, #fff);
    }
    .quota-card h2 {
      margin: 0 0 16px;
      font-size: 1.125rem;
      color: var(--navy);
    }
    .quota-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin: 0 0 20px;
    }
    .quota-stats dt {
    .page-header p,
    .status,
    .description,
    .meta {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--muted);
    }
    .quota-stats dd {
      margin: 4px 0 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--navy);
    }
    .banner {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.9375rem;
    }
    .banner--error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .banner--warn {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }
    .btn {
      cursor: pointer;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 0.9375rem;
      border: none;
    }
    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .btn--primary {
      background: var(--primary, #2563eb);
      color: #fff;
    }
    .btn--secondary {
      background: transparent;
      border: 1px solid var(--border, #cbd5e1);
      color: var(--navy);
    }
    .status {
      margin-top: 16px;
      color: var(--muted);
      font-size: 0.9375rem;
    }
    .status--error {
      color: #b91c1c;
    }
    .session-note {
      font-size: 0.875rem;
      color: var(--muted);
      word-break: break-all;
    }
    code {
      font-size: 0.8125rem;
    }
  `
})
export class Interview implements OnInit {
  private readonly interviewService = inject(InterviewService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly quota = signal<InterviewQuota | null>(null);
  readonly quotaExhausted = signal(false);
  readonly starting = signal(false);
  readonly startMessage = signal<string | null>(null);
  readonly startError = signal(false);
  readonly activeSessionId = signal<string | null>(this.readStoredSessionId());

  async ngOnInit(): Promise<void> {
    await this.refreshQuota();
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    void this.refreshQuota();
  }

  async refreshQuota(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const result = await this.interviewService.loadQuota();
    this.loading.set(false);

    if (!result.ok) {
      this.error.set(result.error);
      this.quota.set(null);
      return;
    }

    this.quota.set(result.quota);
    this.quotaExhausted.set(result.quota.remaining <= 0);
  }

  async startNewSession(): Promise<void> {
    if (this.starting() || this.quotaExhausted()) {
      return;
    }

    this.starting.set(true);
    this.startMessage.set(null);
    this.startError.set(false);

    const outcome = await this.interviewService.startInterview();
    this.starting.set(false);

    if (!outcome.ok) {
      this.startError.set(true);
      this.startMessage.set(outcome.error);
      if (outcome.quotaExhausted) {
        this.quotaExhausted.set(true);
        if (outcome.quota && !outcome.quotaDetailsIncomplete) {
          this.quota.set(outcome.quota);
        } else {
          await this.refreshQuota();
        }
      }
      return;
    }

    this.persistSessionId(outcome.result.session_id);
    this.activeSessionId.set(outcome.result.session_id);
    this.startError.set(false);
    this.startMessage.set(
      outcome.result.resumed
        ? 'Resumed your in-progress session.'
        : 'Interview session started. One attempt has been used for this week.'
    );
    await this.refreshQuota();
  }

  async resumeSession(): Promise<void> {
    const sessionId = this.activeSessionId();
    if (!sessionId || this.starting()) {
      return;
    }

    this.starting.set(true);
    this.startMessage.set(null);
    this.startError.set(false);

    const outcome = await this.interviewService.startInterview({
      resumeSessionId: sessionId
    });
    this.starting.set(false);

    if (!outcome.ok) {
      this.startError.set(true);
      this.startMessage.set(outcome.error);
      if (outcome.error.includes('not resumable') || outcome.error.includes('not found')) {
        this.clearStoredSessionId();
        this.activeSessionId.set(null);
      }
      return;
    }

    this.startError.set(false);
    this.startMessage.set('Resumed your in-progress session.');
    await this.refreshQuota();
  }

  formatReset(iso: string): string {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  private readStoredSessionId(): string | null {
    try {
      return sessionStorage.getItem(ACTIVE_SESSION_KEY);
    } catch {
      return null;
    }
  }

  private persistSessionId(sessionId: string): void {
    try {
      sessionStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    } catch {
      /* storage unavailable */
    }
  }

  private clearStoredSessionId(): void {
    try {
      sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      /* storage unavailable */
    .group {
      margin-top: 32px;
    }
    .group h2 {
      margin: 0 0 12px;
      color: var(--navy);
      font-size: 1.15rem;
    }
    .cards {
      display: grid;
      gap: 16px;
    }
    @media (min-width: 768px) {
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 20px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
    }
    .kind {
      margin: 0;
      color: var(--purple);
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .card h3 {
      margin: 0;
      color: var(--navy);
      font-size: 1.15rem;
    }
    .card .btn-primary {
      align-self: flex-start;
      margin-top: 8px;
    }
    .card .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .banner {
      margin-top: 20px;
      padding: 14px 16px;
      border-radius: 12px;
    }
    .banner p {
      margin: 0 0 12px;
    }
    .banner.error {
      background: #fdecec;
      color: var(--navy);
      border: 1px solid #f3c2c2;
    }
  `,
})
export class Interview implements OnInit {
  private readonly catalog = inject(InterviewCatalogService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly startError = signal<string | null>(null);
  readonly startingId = signal<string | null>(null);
  readonly templates = signal<InterviewTemplate[]>([]);

  readonly groups = computed<CatalogGroup[]>(() => {
    const templates = this.templates();
    return KIND_ORDER.map((kind) => ({
      kind,
      label: KIND_COPY[kind].label,
      description: KIND_COPY[kind].description,
      templates: templates.filter((template) => template.kind === kind),
    })).filter((group) => group.templates.length > 0);
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.templates.set(await this.catalog.listPublishedTemplates());
    } catch (error: unknown) {
      this.templates.set([]);
      this.loadError.set(interviewErrorMessage(error, 'Could not load interviews.'));
    } finally {
      this.loading.set(false);
    }
  }

  async start(template: InterviewTemplate): Promise<void> {
    if (this.startingId()) return;
    this.startingId.set(template.id);
    this.startError.set(null);
    try {
      const sessionId = await this.catalog.startSession(template);
      const opened = await this.router.navigate(['/interview/session', sessionId]);
      if (!opened) {
        this.startError.set('The interview started, but the session page could not be opened.');
      }
    } catch (error: unknown) {
      this.startError.set(interviewErrorMessage(error, 'Could not start this interview.'));
    } finally {
      this.startingId.set(null);
    }
  }
}
