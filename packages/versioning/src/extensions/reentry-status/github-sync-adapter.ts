import { bodiesEqual, sha256 } from './dirty-detection';
import { GitHubConfig, ReentryStatus, SyncResult } from './models';

export interface GitHubIssue {
  id: number;
  url: string;
  title: string;
  body: string;
}

export interface GitHubClient {
  findIssueByTitle(params: {
    owner: string;
    repo: string;
    title: string;
  }): Promise<GitHubIssue | null>;

  createIssue(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    labels: string[];
    assignees?: string[];
  }): Promise<GitHubIssue>;

  updateIssue(params: {
    owner: string;
    repo: string;
    issueId: number;
    title?: string;
    body: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<GitHubIssue>;
}

export class GitHubSyncAdapter {
  constructor(
    private readonly config: GitHubConfig,
    private readonly client: GitHubClient
  ) {}

  renderIssueBody(status: ReentryStatus, reentryMarkdown: string): string {
    // Keep content stable; rely on upstream renderer for milestone + roadmap.
    // Avoid adding timestamps.
    const header = `# Re-entry Status (living)\n\n`;
    return `${header}${reentryMarkdown}`;
  }

  async sync(status: ReentryStatus, reentryMarkdown: string): Promise<SyncResult> {
    const started = Date.now();
    const timestamp = new Date().toISOString();

    const body = this.renderIssueBody(status, reentryMarkdown);
    const bodyHash = sha256(body);

    const lastPublishedHash = status.syncMetadata.published?.githubIssueBodySha256;
    if (lastPublishedHash && lastPublishedHash === bodyHash) {
      return {
        target: 'github',
        success: true,
        timestamp,
        duration: Date.now() - started,
        details: { skipped: true, reason: 'unchanged (hash)' }
      };
    }

    const existing = await this.client.findIssueByTitle({
      owner: this.config.owner,
      repo: this.config.repo,
      title: this.config.issue.title
    });

    if (existing) {
      if (bodiesEqual(existing.body, body)) {
        return {
          target: 'github',
          success: true,
          timestamp,
          duration: Date.now() - started,
          details: { skipped: true, reason: 'unchanged (body)' }
        };
      }

      await this.client.updateIssue({
        owner: this.config.owner,
        repo: this.config.repo,
        issueId: existing.id,
        body,
        labels: this.config.issue.labels,
        assignees: this.config.issue.assignees
      });

      return {
        target: 'github',
        success: true,
        timestamp,
        duration: Date.now() - started,
        details: { updated: true, issueId: existing.id, url: existing.url, bodyHash }
      };
    }

    const created = await this.client.createIssue({
      owner: this.config.owner,
      repo: this.config.repo,
      title: this.config.issue.title,
      body,
      labels: this.config.issue.labels,
      assignees: this.config.issue.assignees
    });

    return {
      target: 'github',
      success: true,
      timestamp,
      duration: Date.now() - started,
      details: { created: true, issueId: created.id, url: created.url, bodyHash }
    };
  }
}
