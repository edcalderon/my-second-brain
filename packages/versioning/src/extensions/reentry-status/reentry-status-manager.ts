import { ConfigManager } from './config-manager';
import { FileManager } from './file-manager';
import { sha256 } from './dirty-detection';
import { GitHubRestClient } from './github-rest-client';
import { GitHubSyncAdapter } from './github-sync-adapter';
import { ObsidianCliClient } from './obsidian-cli-client';
import { ObsidianSyncAdapter } from './obsidian-sync-adapter';
import { RoadmapRenderer } from './roadmap-renderer';
import { StatusRenderer } from './status-renderer';
import { GitHubConfig, ObsidianConfig, ReentryStatus, SyncResult, SyncTarget, UpdateContext } from './models';

export interface GitHubSyncer {
  renderIssueBody(status: ReentryStatus, reentryMarkdown: string): string;
  sync(status: ReentryStatus, reentryMarkdown: string): Promise<SyncResult>;
}

export interface ObsidianSyncer {
  renderNoteContent(status: ReentryStatus, reentryMarkdown: string): string;
  sync(status: ReentryStatus, reentryMarkdown: string): Promise<SyncResult>;
}

export interface ReentryStatusManagerOptions {
  fileManager?: FileManager;
  createGitHubSyncer?: (config: GitHubConfig) => GitHubSyncer;
  createObsidianSyncer?: (config: ObsidianConfig) => ObsidianSyncer;
  isObsidianAvailable?: () => Promise<boolean>;
}

export class ReentryStatusManager {
  private readonly fileManager: FileManager;
  private readonly createGitHubSyncer?: (config: GitHubConfig) => GitHubSyncer;
  private readonly createObsidianSyncer?: (config: ObsidianConfig) => ObsidianSyncer;
  private readonly isObsidianAvailable?: () => Promise<boolean>;

  constructor(options: ReentryStatusManagerOptions = {}) {
    this.fileManager = options.fileManager ?? new FileManager();
    this.createGitHubSyncer = options.createGitHubSyncer;
    this.createObsidianSyncer = options.createObsidianSyncer;
    this.isObsidianAvailable = options.isObsidianAvailable;
  }

  createInitialStatus(): ReentryStatus {
    return {
      schemaVersion: '1.1',
      version: '0.0.0',
      lastUpdated: new Date(0).toISOString(),
      updatedBy: 'unknown',
      context: {
        trigger: 'manual',
        gitInfo: { branch: '', commit: '', author: '', timestamp: new Date(0).toISOString() },
        versioningInfo: {}
      },

      milestone: null,
      roadmapFile: RoadmapRenderer.defaultRoadmapPath(),

      currentPhase: 'planning',
      milestones: [],
      blockers: [],
      nextSteps: [],
      risks: [],
      dependencies: [],

      versioning: {
        currentVersion: '0.0.0',
        previousVersion: '0.0.0',
        versionType: 'patch'
      },

      syncMetadata: {
        lastSyncAttempt: new Date(0).toISOString(),
        lastSuccessfulSync: new Date(0).toISOString()
      }
    };
  }

  async loadOrInit(rootConfig: any): Promise<ReentryStatus> {
    const existing = await this.fileManager.loadStatus(rootConfig);
    if (existing) return existing;

    const initial = this.createInitialStatus();
    await this.fileManager.writeStatusFiles(rootConfig, initial);
    return initial;
  }

  async updateStatus(rootConfig: any, updater: (current: ReentryStatus) => ReentryStatus): Promise<ReentryStatus> {
    const current = await this.loadOrInit(rootConfig);
    const next = updater(current);
    await this.fileManager.writeStatusFiles(rootConfig, next);
    return next;
  }

  async applyContext(rootConfig: any, context: UpdateContext): Promise<ReentryStatus> {
    return await this.updateStatus(rootConfig, (current) => ({
      ...current,
      schemaVersion: '1.1',
      context,
      lastUpdated: new Date().toISOString()
    }));
  }

  async ensureRoadmapExists(rootConfig: any, status: ReentryStatus): Promise<void> {
    const roadmapPath = status.roadmapFile || RoadmapRenderer.defaultRoadmapPath();
    const existing = await this.fileManager.readFileIfExists(roadmapPath);

    if (!existing) {
      await this.fileManager.writeFileIfChanged(
        roadmapPath,
        RoadmapRenderer.renderTemplate({}, { milestone: status.milestone, roadmapFile: roadmapPath })
      );
      return;
    }

    const upserted = RoadmapRenderer.upsertManagedBlock(existing, { milestone: status.milestone, roadmapFile: roadmapPath });
    if (upserted.changed) {
      await this.fileManager.writeFileIfChanged(roadmapPath, upserted.content);
    }
  }

  async syncAll(rootConfig: any, targets?: SyncTarget[]): Promise<SyncResult[]> {
    const config = ConfigManager.loadConfig(rootConfig);
    const actualTargets = targets ?? ConfigManager.getSyncTargets(config);

    const status = await this.loadOrInit(rootConfig);

    const results: SyncResult[] = [];

    // Always keep local files up to date if requested.
    if (actualTargets.includes('files')) {
      const started = Date.now();
      try {
        await this.fileManager.writeStatusFiles(rootConfig, status);
        await this.ensureRoadmapExists(rootConfig, status);
        results.push({ target: 'files', success: true, timestamp: new Date().toISOString(), duration: Date.now() - started });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          target: 'files',
          success: false,
          timestamp: new Date().toISOString(),
          duration: Date.now() - started,
          error: { message, recoverable: false }
        });
        throw error;
      }
    }

    const reentryMarkdown = StatusRenderer.renderMarkdown(status);

    if (actualTargets.includes('github') && config.github?.enabled) {
      const started = Date.now();
      try {
        const syncer: GitHubSyncer = this.createGitHubSyncer
          ? this.createGitHubSyncer(config.github)
          : new GitHubSyncAdapter(config.github, new GitHubRestClient(config.github.auth.token));

        const result = await syncer.sync(status, reentryMarkdown);
        results.push(result);

        const body = syncer.renderIssueBody(status, reentryMarkdown);
        const bodyHash = sha256(body);

        if ((result.details as any)?.created || (result.details as any)?.updated) {
          await this.fileManager.writeStatusFiles(rootConfig, {
            ...status,
            schemaVersion: '1.1',
            syncMetadata: {
              ...status.syncMetadata,
              githubIssueId: (result.details as any).issueId ?? status.syncMetadata.githubIssueId,
              githubIssueUrl: (result.details as any).url ?? status.syncMetadata.githubIssueUrl,
              published: {
                ...(status.syncMetadata.published ?? {}),
                githubIssueBodySha256: bodyHash
              }
            }
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          target: 'github',
          success: false,
          timestamp: new Date().toISOString(),
          duration: Date.now() - started,
          error: { message, recoverable: !config.failHard }
        });
        if (config.failHard) throw error;
      }
    }

    if (actualTargets.includes('obsidian') && config.obsidian?.enabled) {
      const started = Date.now();
      try {
        const available = this.isObsidianAvailable ? await this.isObsidianAvailable() : await ObsidianCliClient.isAvailable();
        if (!available) throw new Error('obsidian CLI not available');

        const syncer: ObsidianSyncer = this.createObsidianSyncer
          ? this.createObsidianSyncer(config.obsidian)
          : new ObsidianSyncAdapter(config.obsidian, new ObsidianCliClient());

        const result = await syncer.sync(status, reentryMarkdown);
        results.push(result);

        const contentHash = sha256(syncer.renderNoteContent(status, reentryMarkdown));
        if ((result.details as any)?.updated) {
          await this.fileManager.writeStatusFiles(rootConfig, {
            ...status,
            schemaVersion: '1.1',
            syncMetadata: {
              ...status.syncMetadata,
              obsidianNotePath: config.obsidian.notePath,
              published: {
                ...(status.syncMetadata.published ?? {}),
                obsidianNoteBodySha256: contentHash
              }
            }
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          target: 'obsidian',
          success: false,
          timestamp: new Date().toISOString(),
          duration: Date.now() - started,
          error: { message, recoverable: !config.failHard }
        });
        if (config.failHard) throw error;
      }
    }

    return results;
  }
}
