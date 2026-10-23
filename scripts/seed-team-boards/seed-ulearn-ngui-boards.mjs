import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = 'madhukiraneluri/ulearn-ngui';

function ghJson(args) {
  const out = execFileSync('gh', args, { encoding: 'utf8' });
  return out.trim() ? JSON.parse(out) : null;
}

function gh(args) {
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function ensureLabel(label) {
  gh([
    'label',
    'create',
    label.name,
    '--repo',
    REPO,
    '--color',
    label.color,
    '--description',
    label.description,
    '--force'
  ]);
}

function ensureMilestone(title, description) {
  const list = ghJson(['api', `repos/${REPO}/milestones?state=open&per_page=100`]) ?? [];
  const existing = list.find((m) => m.title === title);
  if (existing) return existing.number;
  const created = ghJson([
    'api',
    `repos/${REPO}/milestones`,
    '-X',
    'POST',
    '-f',
    `title=${title}`,
    '-f',
    `description=${description}`
  ]);
  return created.number;
}

function issueExists(title) {
  const found = ghJson([
    'issue',
    'list',
    '--repo',
    REPO,
    '--state',
    'open',
    '--search',
    `in:title "${title.replaceAll('"', '')}"`,
    '--json',
    'title,number',
    '--limit',
    '20'
  ]) ?? [];
  return found.some((issue) => issue.title === title);
}

function createIssue(issue) {
  if (issueExists(issue.title)) {
    console.log(`skip (exists): ${issue.title}`);
    return;
  }
  const args = [
    'issue',
    'create',
    '--repo',
    REPO,
    '--title',
    issue.title,
    '--body',
    issue.body,
    '--milestone',
    issue.milestone
  ];
  for (const label of issue.labels ?? []) args.push('--label', label);
  console.log(execFileSync('gh', args, { encoding: 'utf8' }).trim());
}

const data = JSON.parse(readFileSync(join(__dirname, 'ulearn-ngui-tasks.json'), 'utf8'));
console.log(`Seeding ${REPO}`);
for (const label of data.labels) ensureLabel(label);
for (const m of data.milestones) {
  console.log(`milestone: ${m.title} (#${ensureMilestone(m.title, m.description)})`);
}
for (const issue of data.issues) createIssue(issue);
console.log('Done.');
