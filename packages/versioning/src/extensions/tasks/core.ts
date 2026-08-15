import { createHash } from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

import { ReentryStatus } from '../reentry-status/models';
import { StatusRenderer } from '../reentry-status/status-renderer';

export type TaskCategory = 'active' | 'pending' | 'done';

export interface TaskEntry {
  category: TaskCategory;
  feature: string;
  directory: string;
  fileName: string;
  absolutePath: string;
  relativePath: string;
  title: string;
  isSpec: boolean;
  content: string;
}

export interface TaskGroup {
  category: TaskCategory;
  feature: string;
  directory: string;
  files: TaskEntry[];
}

export interface TaskWorkspaceSnapshot {
  rootDir: string;
  agentsDir: string;
  groups: TaskGroup[];
  entries: TaskEntry[];
  counts: {
    active: number;
    pending: number;
    done: number;
    specs: number;
    features: number;
  };
  snapshotHash: string;
}

export interface TaskSyncMetadata {
  snapshotHash: string;
  generatedAt: string;
  activeCount: number;
  pendingCount: number;
  doneCount: number;
  specCount: number;
  featureCount: number;
}

export interface TaskValidationOptions {
  statusJsonPath?: string;
  statusMarkdownPath?: string;
}

export interface TaskValidationResult {
  ok: boolean;
  errors: string[];
  snapshot: TaskWorkspaceSnapshot;
}

const CATEGORY_DIRS: Record<TaskCategory, string> = {
  active: 'active-tasks',
  pending: 'pending-tasks',
  done: 'done-tasks'
};

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function prettifySlug(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveTitleFromFilename(fileName: string): string {
  const base = fileName.replace(/\.md$/i, '');
  const cleaned = base.replace(/^\d+[-_.]*/, '');
  return prettifySlug(cleaned) || prettifySlug(base) || fileName;
}

function parseTitleFromContent(content: string, fallback: string): string {
  const normalized = normalizeNewlines(content);
  const heading = normalized.match(/^(?:#|##)\s+(.+?)\s*$/m);
  return heading ? heading[1].trim() : fallback;
}

function updateStatusLine(content: string, nextStatus: string): string {
  const normalized = normalizeNewlines(content);
  const lines = normalized.split('\n');
  const statusIndex = lines.findIndex((line) => /^Status:\s*/i.test(line));

  if (statusIndex !== -1) {
    lines[statusIndex] = `Status: ${nextStatus}`;
    return `${lines.join('\n').replace(/\n?$/, '\n')}`;
  }

  const headingIndex = lines.findIndex((line) => /^(?:#|##)\s+/.test(line));
  if (headingIndex === -1) {
    return `Status: ${nextStatus}\n\n${normalized.replace(/\n?$/, '\n')}`;
  }

  const insertionPoint = Math.min(headingIndex + 1, lines.length);
  lines.splice(insertionPoint, 0, '', `Status: ${nextStatus}`, '');
  return `${lines.join('\n').replace(/\n?$/, '\n')}`;
}

function resolveTaskInputPath(rootDir: string, sourcePath: string): string {
  if (path.isAbsolute(sourcePath)) return sourcePath;
  const normalized = sourcePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (normalized.startsWith('.agents/')) {
    return path.resolve(rootDir, normalized);
  }
  return path.resolve(rootDir, '.agents', normalized);
}

function canonicalizeSnapshot(snapshot: TaskWorkspaceSnapshot): string {
  const canonical = snapshot.entries
    .slice()
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    .map((entry) => [
      entry.relativePath,
      entry.category,
      entry.feature,
      entry.isSpec ? 'spec' : 'task',
      entry.title,
      hashText(normalizeNewlines(entry.content))
    ].join('|'))
    .join('\n');

  return hashText(canonical);
}

export async function scanTaskWorkspace(rootDir: string): Promise<TaskWorkspaceSnapshot> {
  const agentsDir = path.join(rootDir, '.agents');
  const entries: TaskEntry[] = [];
  const groups: TaskGroup[] = [];

  if (!(await fs.pathExists(agentsDir))) {
    return {
      rootDir,
      agentsDir,
      groups,
      entries,
      counts: { active: 0, pending: 0, done: 0, specs: 0, features: 0 },
      snapshotHash: hashText('')
    };
  }

  for (const category of Object.keys(CATEGORY_DIRS) as TaskCategory[]) {
    const categoryDir = path.join(agentsDir, CATEGORY_DIRS[category]);
    if (!(await fs.pathExists(categoryDir))) continue;

    const featureDirs = (await fs.readdir(categoryDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name !== 'README.md')
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const feature of featureDirs) {
      const directory = path.join(categoryDir, feature);
      const files = (await fs.readdir(directory, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md') && entry.name !== 'README.md')
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

      const groupEntries: TaskEntry[] = [];

      for (const fileName of files) {
        const absolutePath = path.join(directory, fileName);
        const content = await fs.readFile(absolutePath, 'utf8');
        const isSpec = fileName.toUpperCase() === '00-SPEC.MD';
        const fallbackTitle = isSpec ? `${prettifySlug(feature)} spec` : deriveTitleFromFilename(fileName);

        const entry: TaskEntry = {
          category,
          feature,
          directory,
          fileName,
          absolutePath,
          relativePath: path.relative(rootDir, absolutePath).split(path.sep).join('/'),
          title: parseTitleFromContent(content, fallbackTitle),
          isSpec,
          content: normalizeNewlines(content)
        };

        entries.push(entry);
        groupEntries.push(entry);
      }

      if (groupEntries.length > 0) {
        groups.push({
          category,
          feature,
          directory,
          files: groupEntries
        });
      }
    }
  }

  const counts = {
    active: entries.filter((entry) => entry.category === 'active' && !entry.isSpec).length,
    pending: entries.filter((entry) => entry.category === 'pending' && !entry.isSpec).length,
    done: entries.filter((entry) => entry.category === 'done' && !entry.isSpec).length,
    specs: entries.filter((entry) => entry.isSpec).length,
    features: groups.length
  };

  return {
    rootDir,
    agentsDir,
    groups,
    entries,
    counts,
    snapshotHash: canonicalizeSnapshot({
      rootDir,
      agentsDir,
      groups,
      entries,
      counts,
      snapshotHash: ''
    })
  };
}

export function buildTaskSyncMetadata(snapshot: TaskWorkspaceSnapshot): TaskSyncMetadata {
  return {
    snapshotHash: snapshot.snapshotHash,
    generatedAt: new Date().toISOString(),
    activeCount: snapshot.counts.active,
    pendingCount: snapshot.counts.pending,
    doneCount: snapshot.counts.done,
    specCount: snapshot.counts.specs,
    featureCount: snapshot.counts.features
  };
}

export function renderTaskReadmeIndex(snapshot: TaskWorkspaceSnapshot, group: TaskGroup): string {
  const spec = group.files.find((entry) => entry.isSpec);
  const taskFiles = group.files.filter((entry) => !entry.isSpec);

  const lines: string[] = [
    `# ${group.feature}`,
    '',
    `Category: ${group.category}-tasks`,
    ''
  ];

  if (spec) {
    lines.push('## Feature Spec', '');
    lines.push(`- [${spec.fileName}](./${spec.fileName})`, '');
  }

  lines.push('## Tasks', '');

  if (taskFiles.length === 0) {
    lines.push('- No task files found', '');
  } else {
    lines.push('| File | Title |');
    lines.push('| --- | --- |');
    for (const entry of taskFiles) {
      lines.push(`| [${entry.fileName}](./${entry.fileName}) | ${entry.title} |`);
    }
    lines.push('');
  }

  lines.push(`Generated from ${snapshot.counts.active + snapshot.counts.pending + snapshot.counts.done} task files.`);
  lines.push('');
  return lines.join('\n');
}

export function renderTaskReadmeMap(snapshot: TaskWorkspaceSnapshot): Map<string, string> {
  const readmes = new Map<string, string>();
  for (const group of snapshot.groups) {
    readmes.set(path.join(group.directory, 'README.md'), renderTaskReadmeIndex(snapshot, group));
  }
  return readmes;
}

export function setTaskStatus(content: string, nextStatus: string): string {
  return updateStatusLine(content, nextStatus);
}

export function createTaskTemplate(fileName: string, title?: string, status: string = 'active'): string {
  const resolvedTitle = title?.trim() || deriveTitleFromFilename(fileName);
  return [
    `# ${resolvedTitle}`,
    '',
    `Status: ${status}`,
    '',
    '## Acceptance Criteria',
    '',
    '- [ ] Fill in the acceptance criteria',
    ''
  ].join('\n');
}

export function createSpecTemplate(featureName: string, title?: string): string {
  const resolvedTitle = title?.trim() || prettifySlug(featureName) || featureName;
  return [
    `# ${resolvedTitle}`,
    '',
    '## Goal',
    '',
    '- [ ] Describe the goal',
    '',
    '## Tasks',
    '',
    '- [ ] Break the work into tasks',
    '',
    '## Acceptance Criteria',
    '',
    '- [ ] Define acceptance criteria',
    ''
  ].join('\n');
}

export async function archiveTaskFile(rootDir: string, sourcePath: string): Promise<{ sourcePath: string; destinationPath: string }> {
  const absoluteSource = resolveTaskInputPath(rootDir, sourcePath);
  const relative = path.relative(rootDir, absoluteSource).split(path.sep).join('/');
  const parts = relative.split('/');

  if (parts.length < 4 || parts[0] !== '.agents') {
    throw new Error(`Task file must live under .agents/active-tasks or .agents/pending-tasks: ${sourcePath}`);
  }

  const categoryDir = parts[1];
  if (categoryDir === 'done-tasks') {
    throw new Error(`Task is already archived: ${sourcePath}`);
  }
  if (categoryDir !== 'active-tasks' && categoryDir !== 'pending-tasks') {
    throw new Error(`Unsupported task category: ${sourcePath}`);
  }

  const feature = parts[2];
  const fileName = parts.slice(3).join('/');
  const destinationPath = path.join(rootDir, '.agents', 'done-tasks', feature, fileName);

  const content = await fs.readFile(absoluteSource, 'utf8');
  await fs.ensureDir(path.dirname(destinationPath));
  await fs.writeFile(destinationPath, setTaskStatus(content, 'done'), 'utf8');
  await fs.remove(absoluteSource);

  return {
    sourcePath: absoluteSource,
    destinationPath
  };
}

export function validateTaskSpecs(snapshot: TaskWorkspaceSnapshot): string[] {
  const warnings: string[] = [];

  for (const entry of snapshot.entries.filter((item) => item.isSpec)) {
    const content = normalizeNewlines(entry.content);
    for (const section of ['Goal', 'Tasks', 'Acceptance Criteria']) {
      if (!new RegExp(`^##\\s+${section}\\s*$`, 'mi').test(content)) {
        warnings.push(`${entry.relativePath} is missing the ${section} section`);
      }
    }
  }

  return warnings;
}

export async function validateTaskWorkspace(
  rootDir: string,
  options: TaskValidationOptions = {}
): Promise<TaskValidationResult> {
  const snapshot = await scanTaskWorkspace(rootDir);
  if (snapshot.entries.length === 0) {
    return {
      ok: true,
      errors: [],
      snapshot
    };
  }

  const errors: string[] = [];
  const readmes = renderTaskReadmeMap(snapshot);

  for (const [readmePath, expected] of readmes.entries()) {
    if (!(await fs.pathExists(readmePath))) {
      errors.push(`Missing README index: ${path.relative(rootDir, readmePath).split(path.sep).join('/')}`);
      continue;
    }

    const actual = normalizeNewlines(await fs.readFile(readmePath, 'utf8'));
    if (actual.trimEnd() !== expected.trimEnd()) {
      errors.push(`Stale README index: ${path.relative(rootDir, readmePath).split(path.sep).join('/')}`);
    }
  }

  for (const warning of validateTaskSpecs(snapshot)) {
    errors.push(warning);
  }

  const statusJsonPath = path.resolve(rootDir, options.statusJsonPath ?? '.versioning/reentry.status.json');
  const statusMarkdownPath = path.resolve(rootDir, options.statusMarkdownPath ?? '.versioning/REENTRY.md');

  if (await fs.pathExists(statusJsonPath)) {
    try {
      const status = StatusRenderer.parseJson(await fs.readFile(statusJsonPath, 'utf8'));
      const metadata = status.workspaceTasks;

      if (!metadata) {
        errors.push(`Missing task snapshot metadata in ${path.relative(rootDir, statusJsonPath).split(path.sep).join('/')}`);
      } else if (metadata.snapshotHash !== snapshot.snapshotHash) {
        errors.push(`Task snapshot hash mismatch in ${path.relative(rootDir, statusJsonPath).split(path.sep).join('/')}`);
      }

      if (await fs.pathExists(statusMarkdownPath)) {
        const expectedMarkdown = StatusRenderer.renderMarkdown(status);
        const actualMarkdown = normalizeNewlines(await fs.readFile(statusMarkdownPath, 'utf8'));
        if (actualMarkdown.trimEnd() !== expectedMarkdown.trimEnd()) {
          errors.push(`Stale reentry markdown: ${path.relative(rootDir, statusMarkdownPath).split(path.sep).join('/')}`);
        }
      } else {
        errors.push(`Missing reentry markdown: ${path.relative(rootDir, statusMarkdownPath).split(path.sep).join('/')}`);
      }
    } catch (error) {
      errors.push(`Unable to parse reentry status: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (snapshot.entries.length > 0) {
    errors.push(`Missing reentry snapshot: ${path.relative(rootDir, statusJsonPath).split(path.sep).join('/')}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    snapshot
  };
}
