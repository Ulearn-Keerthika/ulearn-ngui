import { Injectable, inject } from '@angular/core';
import { supabase } from '../core/supabase.client';
import {
  InterviewSessionStatus,
  InterviewSessionSummary,
  InterviewTemplate,
  InterviewTemplateKind,
} from '../models';
import { InterviewService } from './interview.service';

const TEMPLATE_KINDS: readonly InterviewTemplateKind[] = ['hr', 'technical', 'domain'];
const SESSION_STATUSES: readonly InterviewSessionStatus[] = ['in_progress', 'completed', 'failed'];

interface TemplateRow {
  id: string;
  slug: string;
  title: string;
  kind: string;
  duration_minutes: number;
  status: string;
  created_at: string;
}

interface SessionRow {
  id: string;
  status: string;
  template_id: string;
  prompt_version: string;
  interview_templates: { title: string; kind: string } | { title: string; kind: string }[] | null;
}

/**
 * Templates have no prompt-version column yet. The session still requires
 * prompt_version, so store the published row identity the student started.
 */
export function interviewPromptVersion(template: Pick<InterviewTemplate, 'slug' | 'createdAt'>): string {
  return `${template.slug}:${template.createdAt}`;
}

function formatTemplateVersionNumber(version: number): string {
  return String(version);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTemplateKind(value: string): value is InterviewTemplateKind {
  return (TEMPLATE_KINDS as readonly string[]).includes(value);
}

function isSessionStatus(value: string): value is InterviewSessionStatus {
  return (SESSION_STATUSES as readonly string[]).includes(value);
}

function asTemplateRow(value: unknown): TemplateRow | null {
  if (!isRecord(value)) return null;
  const id = value['id'];
  const slug = value['slug'];
  const title = value['title'];
  const kind = value['kind'];
  const duration = value['duration_minutes'];
  const status = value['status'];
  const createdAt = value['created_at'];
  if (
    typeof id !== 'string' ||
    typeof slug !== 'string' ||
    typeof title !== 'string' ||
    typeof kind !== 'string' ||
    typeof duration !== 'number' ||
    typeof status !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null;
  }
  return {
    id,
    slug,
    title,
    kind,
    duration_minutes: duration,
    status,
    created_at: createdAt,
  };
}

function embeddedTemplate(
  value: SessionRow['interview_templates']
): { title: string; kind: string } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row.title !== 'string' || typeof row.kind !== 'string') return null;
  return row;
}

@Injectable({ providedIn: 'root' })
export class InterviewCatalogService {
  private readonly interviewService = inject(InterviewService);

  /** Published templates only. Drafts are excluded here and by RLS. */
  async listPublishedTemplates(): Promise<InterviewTemplate[]> {
    const { data, error } = await supabase
      .from('interview_templates')
      .select('id, slug, title, kind, duration_minutes, status, created_at')
      .eq('status', 'published')
      .order('title', { ascending: true });

    if (error) throw error;

    const templates: InterviewTemplate[] = [];
    for (const item of data ?? []) {
      const row = asTemplateRow(item);
      if (!row || row.status !== 'published' || !isTemplateKind(row.kind)) continue;
      templates.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        kind: row.kind,
        durationMinutes: row.duration_minutes,
        createdAt: row.created_at,
      });
    }
    return templates;
  }

  /**
   * Start an in-progress session via interview-start (INT-006 quota).
   * Pins prompt_version + template_version_id to the template's current snapshot.
   * Returns the new session id.
   */
  async startSession(template: InterviewTemplate): Promise<string> {
    const version = await this.latestPublishedTemplateVersion(template.id);
    if (!version) {
      throw new Error('This interview is not available right now.');
    }

    const outcome = await this.interviewService.startInterview({
      templateId: template.id,
      promptVersion: formatTemplateVersionNumber(version.version),
      templateVersionId: version.id,
    });

    if (!outcome.ok) {
      throw new Error(outcome.error || 'The interview session was not created.');
    }

    return outcome.result.session_id;
  }

  /** Latest published snapshot for a template. */
  private async latestPublishedTemplateVersion(
    templateId: string
  ): Promise<{ id: string; version: number } | null> {
    const { data: template, error: templateError } = await supabase
      .from('interview_templates')
      .select('id, status, current_version')
      .eq('id', templateId)
      .eq('status', 'published')
      .maybeSingle();

    if (templateError) throw templateError;
    if (!isRecord(template)) return null;
    const currentVersion = template['current_version'];
    const versionNumber =
      typeof currentVersion === 'number'
        ? currentVersion
        : typeof currentVersion === 'string'
          ? Number(currentVersion)
          : NaN;
    if (!Number.isInteger(versionNumber) || versionNumber <= 0) return null;

    const { data: versionRow, error: versionError } = await supabase
      .from('interview_template_versions')
      .select('id, version')
      .eq('template_id', templateId)
      .eq('version', versionNumber)
      .maybeSingle();

    if (versionError) throw versionError;
    if (!isRecord(versionRow) || typeof versionRow['id'] !== 'string') return null;
    const storedVersion = versionRow['version'];
    const parsedVersion =
      typeof storedVersion === 'number'
        ? storedVersion
        : typeof storedVersion === 'string'
          ? Number(storedVersion)
          : NaN;
    if (!Number.isInteger(parsedVersion) || parsedVersion <= 0) return null;
    return { id: versionRow['id'], version: parsedVersion };
  }

  async getOwnSession(sessionId: string): Promise<InterviewSessionSummary | null> {
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('id, status, template_id, prompt_version, interview_templates(title, kind)')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!isRecord(data)) return null;

    const row = data as unknown as SessionRow;
    const template = embeddedTemplate(row.interview_templates);
    if (
      typeof row.id !== 'string' ||
      typeof row.status !== 'string' ||
      typeof row.template_id !== 'string' ||
      typeof row.prompt_version !== 'string' ||
      !isSessionStatus(row.status) ||
      !template ||
      !isTemplateKind(template.kind)
    ) {
      return null;
    }

    return {
      id: row.id,
      status: row.status,
      templateId: row.template_id,
      templateTitle: template.title,
      templateKind: template.kind,
      promptVersion: row.prompt_version,
    };
  }
}

export function interviewErrorMessage(error: unknown, fallback: string): string {
  if (isRecord(error) && typeof error['message'] === 'string' && error['message'].trim()) {
    return error['message'];
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
