import { ReentryStatus } from './models';
import { ROADMAP_MD_FILENAME, REENTRY_STATUS_DIRNAME } from './constants';

export const ROADMAP_MANAGED_START = '<!-- roadmap:managed:start -->';
export const ROADMAP_MANAGED_END = '<!-- roadmap:managed:end -->';

export interface RoadmapRenderOptions {
  projectTitle?: string;
}

export class RoadmapRenderer {
  static defaultRoadmapPath(baseDir: string = REENTRY_STATUS_DIRNAME): string {
    return `${baseDir}/${ROADMAP_MD_FILENAME}`;
  }

  static renderManagedBlock(status?: Pick<ReentryStatus, 'milestone' | 'roadmapFile'>): string {
    const milestoneText = status?.milestone
      ? `${status.milestone.title} (id: ${status.milestone.id})`
      : '—';

    const roadmapFile = status?.roadmapFile ?? RoadmapRenderer.defaultRoadmapPath();

    // Keep this block stable: no timestamps.
    return [
      ROADMAP_MANAGED_START,
      '> Managed by `@edcalderon/versioning` reentry-status-extension.',
      `> Canonical roadmap file: ${roadmapFile}`,
      `> Active milestone: ${milestoneText}`,
      '> ',
      '> Everything outside this block is user-editable.',
      ROADMAP_MANAGED_END,
      ''
    ].join('\n');
  }

  static renderTemplate(options: RoadmapRenderOptions = {}, status?: Pick<ReentryStatus, 'milestone' | 'roadmapFile'>): string {
    const title = options.projectTitle?.trim() ? options.projectTitle.trim() : 'Untitled';

    return [
      `# Project Roadmap – ${title}`,
      '',
      RoadmapRenderer.renderManagedBlock(status),
      '## North Star',
      '',
      '- Describe the long-term outcome this project is aiming for.',
      '',
      '## Now (1–2 weeks)',
      '',
      '- [now-01] Example: Ship X',
      '',
      '## Next (4–8 weeks)',
      '',
      '- [next-01] Example: Improve Y',
      '',
      '## Later',
      '',
      '- [later-01] Example: Explore Z',
      ''
    ].join('\n');
  }

  /**
   * Inserts or updates the managed header block without touching user content.
   */
  static upsertManagedBlock(existing: string, status?: Pick<ReentryStatus, 'milestone' | 'roadmapFile'>): {
    content: string;
    changed: boolean;
  } {
    const managed = RoadmapRenderer.renderManagedBlock(status);
    const input = existing.replace(/\r\n/g, '\n');

    const startIdx = input.indexOf(ROADMAP_MANAGED_START);
    const endIdx = input.indexOf(ROADMAP_MANAGED_END);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const endAfter = endIdx + ROADMAP_MANAGED_END.length;
      const before = input.slice(0, startIdx);
      const after = input.slice(endAfter);
      let afterNormalized = after;
      if (managed.endsWith('\n') && afterNormalized.startsWith('\n')) {
        // Prevent accidental extra blank line when swapping the managed block.
        afterNormalized = afterNormalized.slice(1);
      }
      const next = `${before}${managed}${afterNormalized}`;
      return { content: next, changed: next !== input };
    }

    // No managed block yet: insert right after the first H1 if present, otherwise at top.
    const lines = input.split('\n');
    const h1Index = lines.findIndex((l) => /^#\s+/.test(l));

    if (h1Index !== -1) {
      const insertAt = h1Index + 1;
      const nextLines = [...lines];
      // Ensure a blank line after H1.
      if (nextLines[insertAt] !== '') nextLines.splice(insertAt, 0, '');
      // Insert managed block after that blank line.
      const afterBlank = insertAt + 1;
      nextLines.splice(afterBlank, 0, managed.trimEnd());
      const next = `${nextLines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
      return { content: next, changed: next !== `${input}${input.endsWith('\n') ? '' : '\n'}` };
    }

    const next = `${managed}${input.replace(/^\n+/, '')}`;
    return { content: next, changed: next !== input };
  }
}
