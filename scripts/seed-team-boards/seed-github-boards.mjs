import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function ghJson(args) {
  const out = execFileSync('gh', args, { encoding: 'utf8' });
  return out.trim() ? JSON.parse(out) : null;
}

function gh(args) {
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function ensureLabel(repo, label) {
  try {
    gh(['label', 'create', label.name, '--repo', repo, '--color', label.color, '--description', label.description, '--force']);
  } catch {
    /* exists */
  }
}

function ensureMilestone(repo, title, description) {
  const list = ghJson(['api', `repos/${repo}/milestones?state=open&per_page=100`]) ?? [];
  const existing = list.find((m) => m.title === title);
  if (existing) return existing.number;
  const created = ghJson([
    'api',
    `repos/${repo}/milestones`,
    '-X',
    'POST',
    '-f',
    `title=${title}`,
    '-f',
    `description=${description}`
  ]);
  return created.number;
}

function createIssue(repo, issue) {
  const args = [
    'issue',
    'create',
    '--repo',
    repo,
    '--title',
    issue.title,
    '--body',
    issue.body,
    '--milestone',
    issue.milestone
  ];
  for (const label of issue.labels ?? []) {
    args.push('--label', label);
  }
  const url = execFileSync('gh', args, { encoding: 'utf8' }).trim();
  console.log(url);
}

function seed(repo, file) {
  const data = JSON.parse(readFileSync(join(__dirname, file), 'utf8'));
  console.log(`\n=== Seeding ${repo} ===`);
  for (const label of data.labels) ensureLabel(repo, label);
  for (const m of data.milestones) {
    const number = ensureMilestone(repo, m.title, m.description);
    console.log(`milestone: ${m.title} (#${number})`);
  }
  for (const issue of data.issues) {
    createIssue(repo, issue);
  }
}

seed('madhukiraneluri/ulearn-crt', 'crt-tasks.json');
seed('madhukiraneluri/ulearn-ai-interview', 'interview-tasks.json');
console.log('\nDone.');
