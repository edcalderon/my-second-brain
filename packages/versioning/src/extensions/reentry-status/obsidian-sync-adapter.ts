import { bodiesEqual, sha256 } from './dirty-detection';
import { ObsidianConfig, ReentryStatus, SyncResult } from './models';

export interface ObsidianNote {
  path: string;
  content: string;
}

export interface ObsidianClient {
  getNote(params: { vaultPath: string; notePath: string }): Promise<ObsidianNote | null>;
  upsertNote(params: { vaultPath: string; notePath: string; content: string }): Promise<ObsidianNote>;
}

export class ObsidianSyncAdapter {
  constructor(
    private readonly config: ObsidianConfig,
    private readonly client: ObsidianClient
  ) {}

  renderNoteContent(status: ReentryStatus, reentryMarkdown: string): string {
    const fm = this.config.frontmatter;
    if (!fm || Object.keys(fm).length === 0) return reentryMarkdown;

    const lines: string[] = ['---'];
    for (const key of Object.keys(fm).sort()) {
      const value = (fm as any)[key];
      if (value === undefined) continue;

      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - ${String(item)}`);
        continue;
      }

      if (value && typeof value === 'object') {
        // Keep it simple: embed JSON for nested objects.
        lines.push(`${key}: ${JSON.stringify(value)}`);
        continue;
      }

      lines.push(`${key}: ${String(value)}`);
    }
    lines.push('---', '');

    // Keep deterministic: do not add timestamps.
    // Also include roadmap pointer and milestone info (already present in REENTRY.md).
    return `${lines.join('\n')}${reentryMarkdown}`;
  }

  async sync(status: ReentryStatus, reentryMarkdown: string): Promise<SyncResult> {
    const started = Date.now();
    const timestamp = new Date().toISOString();

    const content = this.renderNoteContent(status, reentryMarkdown);
    const contentHash = sha256(content);

    const lastPublishedHash = status.syncMetadata.published?.obsidianNoteBodySha256;
    if (lastPublishedHash && lastPublishedHash === contentHash) {
      return {
        target: 'obsidian',
        success: true,
        timestamp,
        duration: Date.now() - started,
        details: { skipped: true, reason: 'unchanged (hash)' }
      };
    }

    const existing = await this.client.getNote({
      vaultPath: this.config.vaultPath,
      notePath: this.config.notePath
    });

    if (existing && bodiesEqual(existing.content, content)) {
      return {
        target: 'obsidian',
        success: true,
        timestamp,
        duration: Date.now() - started,
        details: { skipped: true, reason: 'unchanged (content)' }
      };
    }

    await this.client.upsertNote({
      vaultPath: this.config.vaultPath,
      notePath: this.config.notePath,
      content
    });

    return {
      target: 'obsidian',
      success: true,
      timestamp,
      duration: Date.now() - started,
      details: { updated: true, notePath: this.config.notePath, contentHash }
    };
  }
}
