import * as path from 'path';

import {
  ReentryMilestoneLink,
  ReentrySchemaVersion,
  ReentryStatus
} from './models';
import {
  REENTRY_STATUS_DIRNAME,
  REENTRY_STATUS_MD_FILENAME
} from './constants';
import { RoadmapRenderer } from './roadmap-renderer';

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const child = obj[key];
      if (child === undefined) continue;
      sorted[key] = sortKeysDeep(child);
    }
    return sorted;
  }
  return value;
}

function nonEmptyStringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

export class StatusRenderer {
  static defaultReentryMarkdownPath(): string {
    return path.join(REENTRY_STATUS_DIRNAME, REENTRY_STATUS_MD_FILENAME);
  }

  static defaultRoadmapPath(): string {
    return RoadmapRenderer.defaultRoadmapPath();
  }

  static parseJson(json: string): ReentryStatus {
    const raw = JSON.parse(json) as any;

    const schemaVersion: ReentrySchemaVersion = raw.schemaVersion === '1.1' ? '1.1' : '1.0';

    const milestone: ReentryMilestoneLink | null =
      raw.milestone && typeof raw.milestone === 'object' && typeof raw.milestone.id === 'string'
        ? { id: String(raw.milestone.id), title: nonEmptyStringOr(raw.milestone.title, String(raw.milestone.id)) }
        : null;

    const roadmapFile = nonEmptyStringOr(raw.roadmapFile, StatusRenderer.defaultRoadmapPath());

    // Normalize missing structures to safe defaults (v1.0 compatibility).
    const normalized: ReentryStatus = {
      schemaVersion,
      version: nonEmptyStringOr(raw.version, '0.0.0'),
      lastUpdated: nonEmptyStringOr(raw.lastUpdated, new Date(0).toISOString()),
      updatedBy: nonEmptyStringOr(raw.updatedBy, 'unknown'),
      context: raw.context ?? {
        trigger: 'manual',
        gitInfo: { branch: '', commit: '', author: '', timestamp: new Date(0).toISOString() },
        versioningInfo: {}
      },

      milestone,
      roadmapFile,

      currentPhase: raw.currentPhase ?? 'planning',
      milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
      blockers: Array.isArray(raw.blockers) ? raw.blockers : [],
      nextSteps: Array.isArray(raw.nextSteps) ? raw.nextSteps : [],
      risks: Array.isArray(raw.risks) ? raw.risks : [],
      dependencies: Array.isArray(raw.dependencies) ? raw.dependencies : [],

      versioning: raw.versioning ?? {
        currentVersion: '',
        previousVersion: '',
        versionType: 'patch'
      },

      syncMetadata: raw.syncMetadata ?? {
        lastSyncAttempt: new Date(0).toISOString(),
        lastSuccessfulSync: new Date(0).toISOString()
      }
    };

    // Ensure new nested optional objects exist only when needed; do not force migration writes.
    return normalized;
  }

  static renderJson(status: ReentryStatus): string {
    const stable = sortKeysDeep(status);
    return `${JSON.stringify(stable, null, 2)}\n`;
  }

  static renderMarkdown(status: ReentryStatus): string {
    const milestoneText = status.milestone
      ? `${status.milestone.title} (id: ${status.milestone.id})`
      : '—';

    const nextMicroStep = status.nextSteps?.[0]?.description ?? '—';

    return [
      '# Re-entry Status',
      '',
      `Schema: ${status.schemaVersion}`,
      `Version: ${status.version}`,
      `Phase: ${status.currentPhase}`,
      '',
      `Next micro-step: ${nextMicroStep}`,
      '',
      `Milestone: ${milestoneText}`,
      `Roadmap: ${status.roadmapFile || StatusRenderer.defaultRoadmapPath()}`,
      '',
      '## Notes',
      '',
      '- This file is generated for stable diffs. Edit ROADMAP.md for long-term planning.',
      ''
    ].join('\n');
  }

  static parseMarkdown(_markdown: string): Partial<ReentryStatus> {
    const markdown = _markdown.replace(/\r\n/g, '\n');

    const out: Partial<ReentryStatus> = {};

    const schema = /^Schema:[ \t]*([^\n\r]*)$/m.exec(markdown);
    if (schema) out.schemaVersion = schema[1].trim() as any;

    const version = /^Version:[ \t]*([^\n\r]*)$/m.exec(markdown);
    if (version) out.version = version[1].trim();

    const phase = /^Phase:[ \t]*([^\n\r]*)$/m.exec(markdown);
    if (phase) out.currentPhase = phase[1].trim() as any;

    const next = /^Next micro-step:[ \t]*([^\n\r]*)$/m.exec(markdown);
    if (next) {
      const desc = next[1].trim();
      if (desc && desc !== '—') out.nextSteps = [{ id: 'next', description: desc, priority: 1 }];
    }

    const roadmap = /^Roadmap:[ \t]*([^\n\r]*)$/m.exec(markdown);
    if (roadmap) out.roadmapFile = roadmap[1].trim();

    const milestone = /^Milestone:[ \t]*([^\n\r]*)$/m.exec(markdown);
    if (milestone) {
      const text = milestone[1].trim();
      if (!text || text === '—') {
        out.milestone = null;
      } else {
        const markers = [' (id: ', '(id: '];
        const marker = markers.find((m) => text.includes(m));
        if (!marker) return out;

        const markerIndex = text.lastIndexOf(marker);
        if (markerIndex !== -1 && text.endsWith(')')) {
          const title = text.slice(0, markerIndex).trim();
          const id = text.slice(markerIndex + marker.length, -1).trim();
          out.milestone = { title, id };
        }
      }
    }

    return out;
  }
}
