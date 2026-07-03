import * as fs from 'fs-extra';
import * as path from 'path';

export interface ChangelogSection {
  heading: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  heading: string;
  sections: ChangelogSection[];
}

export interface ChangelogGuardOptions {
  changelogPath?: string;
  version?: string;
  allowEmpty?: boolean;
  cwd?: string;
}

export interface ChangelogGuardResult {
  ok: boolean;
  version: string | null;
  entry: ChangelogEntry | null;
  entries: ChangelogEntry[];
  reason?: string;
}

const releaseHeadingPattern = /^##\s+\[?v?([0-9]+(?:\.[0-9]+){2}(?:-[0-9A-Za-z.-]+)?)\]?.*$/;
const sectionHeadingPattern = /^###\s+(.+?)\s*$/;
const listItemPattern = /^\s*(?:[-*+]|\d+\.)\s+(.+)$/;

function normalizeVersion(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('v') ? trimmed.slice(1) : trimmed;
}

function uniqueAppend(target: string[], values: string[]): void {
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    if (!target.includes(normalized)) {
      target.push(normalized);
    }
  }
}

function mergeSections(target: ChangelogSection[], source: ChangelogSection[]): void {
  for (const section of source) {
    const existing = target.find((entry) => entry.heading === section.heading);
    if (existing) {
      uniqueAppend(existing.items, section.items);
    } else {
      target.push({
        heading: section.heading,
        items: [...section.items]
      });
    }
  }
}

function parseRawEntries(content: string): ChangelogEntry[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const entries: ChangelogEntry[] = [];

  let currentEntry: ChangelogEntry | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const line of lines) {
    const releaseMatch = line.match(releaseHeadingPattern);
    if (releaseMatch) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = {
        version: normalizeVersion(releaseMatch[1]),
        heading: line.trim(),
        sections: []
      };
      currentSection = null;
      continue;
    }

    if (!currentEntry) continue;

    const sectionMatch = line.match(sectionHeadingPattern);
    if (sectionMatch) {
      currentSection = {
        heading: sectionMatch[1].trim(),
        items: []
      };
      currentEntry.sections.push(currentSection);
      continue;
    }

    if (!currentSection) continue;

    const itemMatch = line.match(listItemPattern);
    if (itemMatch) {
      currentSection.items.push(itemMatch[1].trim());
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}

function dedupeEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
  const merged = new Map<string, ChangelogEntry>();
  const order: string[] = [];

  for (const entry of entries) {
    const existing = merged.get(entry.version);
    if (!existing) {
      merged.set(entry.version, {
        version: entry.version,
        heading: entry.heading,
        sections: entry.sections.map((section) => ({
          heading: section.heading,
          items: [...section.items]
        }))
      });
      order.push(entry.version);
      continue;
    }

    mergeSections(existing.sections, entry.sections);
  }

  return order.map((version) => merged.get(version)!).filter(Boolean);
}

export function parseChangelog(content: string): ChangelogEntry[] {
  return dedupeEntries(parseRawEntries(content));
}

export function hasDocumentedChanges(entry: ChangelogEntry | null | undefined): boolean {
  return Boolean(entry?.sections.some((section) => section.items.length > 0));
}

export function selectChangelogEntry(entries: ChangelogEntry[], version?: string): ChangelogEntry | null {
  if (entries.length === 0) return null;
  if (!version) return entries[0];

  const normalizedVersion = normalizeVersion(version);
  return entries.find((entry) => entry.version === normalizedVersion) ?? null;
}

export function validateChangelog(content: string, options: { version?: string; allowEmpty?: boolean } = {}): ChangelogGuardResult {
  const entries = parseChangelog(content);
  if (entries.length === 0) {
    return {
      ok: false,
      version: null,
      entry: null,
      entries,
      reason: 'No changelog release entries were found.'
    };
  }

  const entry = selectChangelogEntry(entries, options.version);
  if (!entry) {
    return {
      ok: false,
      version: options.version ? normalizeVersion(options.version) : null,
      entry: null,
      entries,
      reason: `No changelog release entry found for version ${normalizeVersion(options.version ?? '')}.`
    };
  }

  if (options.allowEmpty || hasDocumentedChanges(entry)) {
    return {
      ok: true,
      version: entry.version,
      entry,
      entries
    };
  }

  return {
    ok: false,
    version: entry.version,
    entry,
    entries,
    reason: `Changelog entry ${entry.version} has no documented changes.`
  };
}

export async function checkChangelogFile(options: ChangelogGuardOptions = {}): Promise<ChangelogGuardResult> {
  const cwd = options.cwd ?? process.cwd();
  const changelogPath = path.resolve(cwd, options.changelogPath ?? 'CHANGELOG.md');

  if (!(await fs.pathExists(changelogPath))) {
    return {
      ok: false,
      version: options.version ? normalizeVersion(options.version) : null,
      entry: null,
      entries: [],
      reason: `CHANGELOG not found at ${changelogPath}`
    };
  }

  const content = await fs.readFile(changelogPath, 'utf8');
  const result = validateChangelog(content, { version: options.version, allowEmpty: options.allowEmpty });

  if (!result.ok && result.reason) {
    result.reason = `${result.reason} (${changelogPath})`;
  }

  return result;
}
