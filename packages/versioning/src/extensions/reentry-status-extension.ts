import { Command } from 'commander';
import * as fs from 'fs-extra';

import { VersioningExtension } from '../extensions';
import { ConfigManager } from './reentry-status/config-manager';
import {
  REENTRY_EXTENSION_NAME,
  REENTRY_STATUS_DIRNAME,
  ROADMAP_MD_FILENAME
} from './reentry-status/constants';
import { FileManager } from './reentry-status/file-manager';
import { sha256 } from './reentry-status/dirty-detection';
import { GitHubRestClient } from './reentry-status/github-rest-client';
import { GitHubSyncAdapter } from './reentry-status/github-sync-adapter';
import { ObsidianCliClient } from './reentry-status/obsidian-cli-client';
import { ObsidianSyncAdapter } from './reentry-status/obsidian-sync-adapter';
import { ReentryStatus } from './reentry-status/models';
import { parseRoadmapMilestones } from './reentry-status/roadmap-parser';
import { RoadmapRenderer } from './reentry-status/roadmap-renderer';
import { StatusRenderer } from './reentry-status/status-renderer';
import { ReentryStatusManager } from './reentry-status/reentry-status-manager';

const extension: VersioningExtension = {
  name: REENTRY_EXTENSION_NAME,
  description: 'Maintains canonical re-entry status and synchronizes to files, GitHub Issues, and Obsidian notes',
  version: '1.1.0',

  hooks: {
    postVersion: async (type: string, version: string, options: any) => {
      try {
        // Extensions are loaded before the CLI reads config per-command; use global config snapshot.
        const configPath = options?.config ?? 'versioning.config.json';
        if (!(await fs.pathExists(configPath))) return;
        const cfg = await fs.readJson(configPath);

        const reentryCfg = ConfigManager.loadConfig(cfg);
        if (!reentryCfg.enabled || !reentryCfg.autoSync) return;
        if (reentryCfg.hooks?.postVersion === false) return;

        const manager = new ReentryStatusManager({ fileManager: new FileManager() });
        await manager.applyContext(cfg, {
          trigger: 'postVersion',
          command: 'versioning bump',
          options,
          gitInfo: { branch: '', commit: '', author: '', timestamp: new Date().toISOString() },
          versioningInfo: { versionType: type, oldVersion: undefined, newVersion: version }
        });
        await manager.syncAll(cfg);
      } catch (error) {
        console.warn('⚠️  reentry-status postVersion hook failed:', error instanceof Error ? error.message : String(error));
      }
    },

    postRelease: async (version: string, options: any) => {
      try {
        const configPath = options?.config ?? 'versioning.config.json';
        if (!(await fs.pathExists(configPath))) return;
        const cfg = await fs.readJson(configPath);

        const reentryCfg = ConfigManager.loadConfig(cfg);
        if (!reentryCfg.enabled || !reentryCfg.autoSync) return;
        if (reentryCfg.hooks?.postRelease !== true) return;

        const manager = new ReentryStatusManager({ fileManager: new FileManager() });
        await manager.applyContext(cfg, {
          trigger: 'postRelease',
          command: 'versioning release',
          options,
          gitInfo: { branch: '', commit: '', author: '', timestamp: new Date().toISOString() },
          versioningInfo: { newVersion: version }
        });
        await manager.syncAll(cfg);
      } catch (error) {
        console.warn('⚠️  reentry-status postRelease hook failed:', error instanceof Error ? error.message : String(error));
      }
    }
  },

  register: async (program: Command, rootConfig: any) => {
    const fileManager = new FileManager();
    const manager = new ReentryStatusManager({ fileManager });

    const loadRootConfigFile = async (configPath: string): Promise<any> => {
      if (!(await fs.pathExists(configPath))) {
        throw new Error(`Config file not found: ${configPath}. Run 'versioning init' to create one.`);
      }
      return await fs.readJson(configPath);
    };

    const ensureReentryInitialized = async (configPath: string, migrate: boolean): Promise<ReentryStatus> => {
      const cfg = await loadRootConfigFile(configPath);
      const reentryCfg = ConfigManager.loadConfig(cfg);
      await fs.ensureDir(REENTRY_STATUS_DIRNAME);

      const existingJson = await fileManager.readFileIfExists(reentryCfg.files.jsonPath);
      if (existingJson) {
        const parsed = StatusRenderer.parseJson(existingJson);
        if (migrate && parsed.schemaVersion === '1.0') {
          // Explicit migration: rewrite as 1.1 without changing semantics.
          const migrated: ReentryStatus = {
            ...parsed,
            schemaVersion: '1.1',
            milestone: parsed.milestone ?? null,
            roadmapFile: parsed.roadmapFile || RoadmapRenderer.defaultRoadmapPath()
          };
          await fileManager.writeStatusJson(cfg, migrated);
          return migrated;
        }
        return parsed;
      }

      const initial: ReentryStatus = {
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

      await fileManager.writeStatusFiles(cfg, initial);
      return initial;
    };

    program
      .command('reentry')
      .description('Manage re-entry status (fast layer)')
      .addCommand(
        new Command('init')
          .description('Initialize re-entry status files')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('--migrate', 'rewrite v1.0 schema to v1.1 (no semantic changes)', false)
          .action(async (options) => {
            const status = await ensureReentryInitialized(options.config, Boolean(options.migrate));
            console.log(`✅ Initialized re-entry status (schema ${status.schemaVersion})`);
          })
      )
      .addCommand(
        new Command('set')
          .description('Update re-entry status fields (fast layer)')
          .option('--phase <phase>', 'Set current phase')
          .option('--next <text>', 'Set next micro-step (replaces first nextSteps entry)')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('--migrate', 'rewrite v1.0 schema to v1.1 (no semantic changes)', false)
          .action(async (options) => {
            const cfg = await loadRootConfigFile(options.config);
            const status = await ensureReentryInitialized(options.config, Boolean(options.migrate));

            const nextStepText = typeof options.next === 'string' ? options.next.trim() : '';
            const phase = typeof options.phase === 'string' ? options.phase.trim() : '';

            const updated: ReentryStatus = {
              ...status,
              schemaVersion: '1.1',
              currentPhase: phase ? (phase as any) : status.currentPhase,
              nextSteps: nextStepText
                ? [{ id: 'next', description: nextStepText, priority: 1 }]
                : status.nextSteps,
              lastUpdated: new Date().toISOString()
            };

            await manager.updateStatus(cfg, () => updated);
            console.log('✅ Re-entry status updated');
          })
      )
      .addCommand(
        new Command('sync')
          .description('Ensure generated status files exist and are up to date (idempotent)')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('--migrate', 'rewrite v1.0 schema to v1.1 (no semantic changes)', false)
          .action(async (options) => {
            const cfg = await loadRootConfigFile(options.config);
            const reentryCfg = ConfigManager.loadConfig(cfg);
            const status = await ensureReentryInitialized(options.config, Boolean(options.migrate));

            // Ensure ROADMAP exists (light touch: only managed block is updated).
            const roadmapPath = status.roadmapFile || RoadmapRenderer.defaultRoadmapPath();
            const existing = await fileManager.readFileIfExists(roadmapPath);
            if (!existing) {
              await fileManager.writeFileIfChanged(
                roadmapPath,
                RoadmapRenderer.renderTemplate({}, { milestone: status.milestone, roadmapFile: roadmapPath })
              );
            } else {
              const upserted = RoadmapRenderer.upsertManagedBlock(existing, { milestone: status.milestone, roadmapFile: roadmapPath });
              if (upserted.changed) {
                await fileManager.writeFileIfChanged(roadmapPath, upserted.content);
              }
            }

            // Always ensure JSON + REENTRY.md are consistent.
            await fileManager.writeStatusFiles(cfg, status);
            const reentryMarkdown = StatusRenderer.renderMarkdown(status);

            // Optional external sync targets (fail-soft by default).
            let nextStatus: ReentryStatus = status;

            if (reentryCfg.github?.enabled) {
              try {
                const client = new GitHubRestClient(reentryCfg.github.auth.token);
                const adapter = new GitHubSyncAdapter(reentryCfg.github, client);
                const result = await adapter.sync(nextStatus, reentryMarkdown);

                const body = adapter.renderIssueBody(nextStatus, reentryMarkdown);
                const bodyHash = sha256(body);

                if ((result.details as any)?.created || (result.details as any)?.updated) {
                  nextStatus = {
                    ...nextStatus,
                    schemaVersion: '1.1',
                    syncMetadata: {
                      ...nextStatus.syncMetadata,
                      githubIssueId: (result.details as any).issueId ?? nextStatus.syncMetadata.githubIssueId,
                      githubIssueUrl: (result.details as any).url ?? nextStatus.syncMetadata.githubIssueUrl,
                      published: {
                        ...(nextStatus.syncMetadata.published ?? {}),
                        githubIssueBodySha256: bodyHash
                      }
                    }
                  };
                  await fileManager.writeStatusFiles(cfg, nextStatus);
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (reentryCfg.failHard) throw error;
                console.warn(`⚠️  GitHub sync skipped: ${message}`);
              }
            }

            if (reentryCfg.obsidian?.enabled) {
              try {
                const available = await ObsidianCliClient.isAvailable();
                if (!available) {
                  throw new Error('obsidian CLI not available (enable it in Obsidian Settings → General → Command line interface)');
                }

                const client = new ObsidianCliClient();
                const adapter = new ObsidianSyncAdapter(reentryCfg.obsidian, client);
                const result = await adapter.sync(nextStatus, reentryMarkdown);

                const content = adapter.renderNoteContent(nextStatus, reentryMarkdown);
                const contentHash = sha256(content);

                if ((result.details as any)?.updated) {
                  nextStatus = {
                    ...nextStatus,
                    schemaVersion: '1.1',
                    syncMetadata: {
                      ...nextStatus.syncMetadata,
                      obsidianNotePath: reentryCfg.obsidian.notePath,
                      published: {
                        ...(nextStatus.syncMetadata.published ?? {}),
                        obsidianNoteBodySha256: contentHash
                      }
                    }
                  };
                  await fileManager.writeStatusFiles(cfg, nextStatus);
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (reentryCfg.failHard) throw error;
                console.warn(`⚠️  Obsidian sync skipped: ${message}`);
              }
            }

            console.log('✅ Re-entry sync complete');
          })
      );

    program
      .command('roadmap')
      .description('Manage roadmap/backlog (slow layer)')
      .addCommand(
        new Command('init')
          .description(`Create ${REENTRY_STATUS_DIRNAME}/${ROADMAP_MD_FILENAME} if missing and ensure managed header block`)
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('-t, --title <title>', 'project title for ROADMAP.md template', 'Untitled')
          .action(async (options) => {
            const cfg = await loadRootConfigFile(options.config);
            const status = await ensureReentryInitialized(options.config, false);
            const roadmapPath = status.roadmapFile || RoadmapRenderer.defaultRoadmapPath();

            const existing = await fileManager.readFileIfExists(roadmapPath);
            if (!existing) {
              await fileManager.writeFileIfChanged(
                roadmapPath,
                RoadmapRenderer.renderTemplate({ projectTitle: options.title }, { milestone: status.milestone, roadmapFile: roadmapPath })
              );
              console.log(`✅ Created ${roadmapPath}`);
              return;
            }

            const upserted = RoadmapRenderer.upsertManagedBlock(existing, { milestone: status.milestone, roadmapFile: roadmapPath });
            if (upserted.changed) {
              await fileManager.writeFileIfChanged(roadmapPath, upserted.content);
              console.log(`✅ Updated managed block in ${roadmapPath}`);
            } else {
              console.log(`✅ ${roadmapPath} already initialized`);
            }

            // Keep REENTRY.md consistent with roadmap references.
            await fileManager.writeReentryMarkdown(cfg, status);
          })
      )
      .addCommand(
        new Command('list')
          .description('List roadmap milestones parsed from ROADMAP.md')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .action(async (options) => {
            const status = await ensureReentryInitialized(options.config, false);
            const roadmapPath = status.roadmapFile || RoadmapRenderer.defaultRoadmapPath();
            const content = await fileManager.readFileIfExists(roadmapPath);
            if (!content) {
              console.warn(`⚠️  ${roadmapPath} not found. Run 'versioning roadmap init' first.`);
              return;
            }

            const parsed = parseRoadmapMilestones(content);
            for (const w of parsed.warnings) console.warn(`⚠️  ${w}`);

            if (parsed.items.length === 0) {
              console.log('— No milestones found');
              return;
            }

            for (const item of parsed.items) {
              const section = item.section ? ` [${item.section}]` : '';
              console.log(`- ${item.id}: ${item.title}${section}`);
            }
          })
      )
      .addCommand(
        new Command('set-milestone')
          .description('Set active milestone link in reentry.status.json')
          .requiredOption('--id <id>', 'Milestone id (must match a [id] in ROADMAP.md)')
          .requiredOption('--title <title>', 'Milestone title')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .action(async (options) => {
            const cfg = await loadRootConfigFile(options.config);
            const status = await ensureReentryInitialized(options.config, false);
            const next: ReentryStatus = {
              ...status,
              schemaVersion: '1.1',
              milestone: { id: String(options.id), title: String(options.title) },
              roadmapFile: status.roadmapFile || RoadmapRenderer.defaultRoadmapPath()
            };
            await fileManager.writeStatusJson(cfg, next);
            await fileManager.writeReentryMarkdown(cfg, next);
            console.log(`✅ Active milestone set to ${String(options.title)} (${String(options.id)})`);
          })
      )
      .addCommand(
        new Command('add')
          .description('Add a milestone item to ROADMAP.md under a section')
          .requiredOption('--section <section>', 'Now|Next|Later')
          .requiredOption('--item <item>', 'Item text')
          .option('--id <id>', 'Optional explicit id (e.g., now-02)')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .action(async (options) => {
            const status = await ensureReentryInitialized(options.config, false);
            const roadmapPath = status.roadmapFile || RoadmapRenderer.defaultRoadmapPath();
            const content = await fileManager.readFileIfExists(roadmapPath);
            if (!content) {
              console.warn(`⚠️  ${roadmapPath} not found. Run 'versioning roadmap init' first.`);
              return;
            }

            const normalized = content.replace(/\r\n/g, '\n');
            const lines = normalized.split('\n');
            const sectionName = String(options.section).trim();
            const header = `## ${sectionName}`;
            const headerIndex = lines.findIndex((l) => l.trim() === header);
            if (headerIndex === -1) {
              console.warn(`⚠️  Section not found: ${header}.`);
              return;
            }

            const bulletId = options.id ? String(options.id).trim() : undefined;
            const itemText = String(options.item).trim();
            const bullet = bulletId ? `- [${bulletId}] ${itemText}` : `- ${itemText}`;

            // Insert after the header and the following blank line (if any).
            let insertAt = headerIndex + 1;
            if (lines[insertAt] === '') insertAt += 1;
            lines.splice(insertAt, 0, bullet);

            const next = `${lines.join('\n')}\n`;
            await fileManager.writeFileIfChanged(roadmapPath, next);
            console.log(`✅ Added item under ${header}`);
          })
      );
  }
};

export default extension;
