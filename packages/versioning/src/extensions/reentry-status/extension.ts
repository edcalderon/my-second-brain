import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';

import { VersioningExtension } from '../../extensions';
import { canonicalProjectKey, ConfigManager } from './config-manager';
import {
  REENTRY_EXTENSION_NAME,
  REENTRY_STATUS_DIRNAME,
  ROADMAP_MD_FILENAME
} from './constants';
import { FileManager } from './file-manager';
import { sha256 } from './dirty-detection';
import { GitHubRestClient } from './github-rest-client';
import { GitHubSyncAdapter } from './github-sync-adapter';
import { ObsidianCliClient } from './obsidian-cli-client';
import { ObsidianSyncAdapter } from './obsidian-sync-adapter';
import { ReentryStatus } from './models';
import { parseRoadmapMilestones } from './roadmap-parser';
import { RoadmapRenderer } from './roadmap-renderer';
import { StatusRenderer } from './status-renderer';
import { ReentryStatusManager } from './reentry-status-manager';
import { collectGitContext, inferPhase, suggestNextStep } from './git-context';

const extension: VersioningExtension = {
  name: REENTRY_EXTENSION_NAME,
  description: 'Maintains canonical re-entry status and synchronizes to files, GitHub Issues, and Obsidian notes',
  version: '1.2.0',

  hooks: {
    postVersion: async (type: string, version: string, options: any) => {
      try {
        const configPath = options?.config ?? 'versioning.config.json';
        if (!(await fs.pathExists(configPath))) return;
        const cfg = await fs.readJson(configPath);

        const reentryCfg = ConfigManager.loadConfig(cfg);
        if (!reentryCfg.enabled || !reentryCfg.autoSync) return;
        if (reentryCfg.hooks?.postVersion === false) return;

        // Auto-collect real git context
        const gitCtx = await collectGitContext();

        const manager = new ReentryStatusManager({ fileManager: new FileManager() });
        await manager.applyContext(cfg, {
          trigger: 'postVersion',
          command: 'versioning bump',
          options,
          gitInfo: {
            branch: gitCtx.branch,
            commit: gitCtx.commit,
            author: gitCtx.author,
            timestamp: gitCtx.timestamp,
          },
          versioningInfo: { versionType: type, oldVersion: undefined, newVersion: version }
        });

        // Auto-update phase and suggest next step
        const current = await manager.loadOrInit(cfg);
        const phase = inferPhase(gitCtx, version);
        const nextStep = suggestNextStep(gitCtx);

        const updated: ReentryStatus = {
          ...current,
          schemaVersion: '1.1',
          currentPhase: phase as any,
          nextSteps: [{ id: 'next', description: nextStep, priority: 1 }],
          version: version,
          versioning: {
            ...current.versioning,
            currentVersion: version,
            previousVersion: current.versioning.currentVersion,
            versionType: type as any,
          },
          lastUpdated: new Date().toISOString(),
        };

        await manager.updateStatus(cfg, () => updated);
        await manager.syncAll(cfg);

        console.log(`📋 Re-entry auto-updated: phase=${phase}, next="${nextStep}"`);
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

        // Auto-collect real git context
        const gitCtx = await collectGitContext();

        const manager = new ReentryStatusManager({ fileManager: new FileManager() });
        await manager.applyContext(cfg, {
          trigger: 'postRelease',
          command: 'versioning release',
          options,
          gitInfo: {
            branch: gitCtx.branch,
            commit: gitCtx.commit,
            author: gitCtx.author,
            timestamp: gitCtx.timestamp,
          },
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

    const discoverWorkspaceProjects = async (configPath: string): Promise<{ slugs: Set<string>; names: Set<string> }> => {
      const rootDir = path.dirname(configPath);

      const slugs = new Set<string>();
      const names = new Set<string>();

      const considerPackageJson = async (packageJsonPath: string): Promise<void> => {
        try {
          if (!(await fs.pathExists(packageJsonPath))) return;
          const pkg = await fs.readJson(packageJsonPath);
          const name = typeof pkg?.name === 'string' ? String(pkg.name).trim() : '';
          if (!name) return;
          names.add(name);
          const slug = name.includes('/') ? name.split('/').pop() : name;
          if (slug) slugs.add(String(slug));
        } catch {
          // ignore
        }
      };

      const scanOneLevel = async (baseDir: string): Promise<void> => {
        const abs = path.join(rootDir, baseDir);
        if (!(await fs.pathExists(abs))) return;
        const entries = await fs.readdir(abs, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const dirName = entry.name;
          if (dirName === 'node_modules' || dirName === 'dist' || dirName === '.git' || dirName === 'archive') continue;
          slugs.add(dirName);
          await considerPackageJson(path.join(abs, dirName, 'package.json'));
        }
      };

      const scanTwoLevelsUnderApps = async (): Promise<void> => {
        const absApps = path.join(rootDir, 'apps');
        if (!(await fs.pathExists(absApps))) return;
        const entries = await fs.readdir(absApps, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const groupDir = path.join(absApps, entry.name);
          if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'archive') continue;

          const nested = await fs.readdir(groupDir, { withFileTypes: true });
          for (const n of nested) {
            if (!n.isDirectory()) continue;
            if (n.name === 'node_modules' || n.name === 'dist' || n.name === '.git' || n.name === 'archive') continue;
            slugs.add(n.name);
            await considerPackageJson(path.join(groupDir, n.name, 'package.json'));
          }
        }
      };

      await scanOneLevel('apps');
      await scanTwoLevelsUnderApps();
      await scanOneLevel('packages');

      return { slugs, names };
    };

    const validateProjectOption = async (configPath: string, project?: string): Promise<string | undefined> => {
      const canonical = canonicalProjectKey(project);
      if (!canonical) return undefined;

      const { slugs, names } = await discoverWorkspaceProjects(configPath);
      const raw = String(project ?? '').trim();

      const ok = slugs.has(canonical) || names.has(raw) || names.has(`@ed/${canonical}`) || names.has(`@edcalderon/${canonical}`);
      if (!ok) {
        const available = Array.from(slugs).sort().slice(0, 40);
        const suffix = slugs.size > 40 ? '…' : '';
        throw new Error(
          `Unknown project scope: '${raw}'. Expected an existing workspace app/package (try one of: ${available.join(', ')}${suffix}).`
        );
      }

      return canonical;
    };

    const loadRootConfigFile = async (configPath: string): Promise<any> => {
      if (!(await fs.pathExists(configPath))) {
        throw new Error(`Config file not found: ${configPath}. Run 'versioning init' to create one.`);
      }
      return await fs.readJson(configPath);
    };

    const ensureReentryInitialized = async (configPath: string, migrate: boolean, project?: string): Promise<{ cfg: any; status: ReentryStatus }> => {
      const validatedProject = await validateProjectOption(configPath, project);
      const rawCfg = await loadRootConfigFile(configPath);
      const resolved = ConfigManager.loadConfig(rawCfg, validatedProject);
      const cfg = {
        ...rawCfg,
        reentryStatus: {
          ...((rawCfg as any).reentryStatus ?? {}),
          files: resolved.files,
        },
      };

      const reentryCfg = ConfigManager.loadConfig(cfg, validatedProject);
      await fs.ensureDir(path.dirname(reentryCfg.files.jsonPath));

      const defaultRoadmapPath = path.join(path.dirname(reentryCfg.files.jsonPath), ROADMAP_MD_FILENAME);

      const existingJson = await fileManager.readFileIfExists(reentryCfg.files.jsonPath);
      if (existingJson) {
        const parsed = StatusRenderer.parseJson(existingJson);
        if (migrate && parsed.schemaVersion === '1.0') {
          const migrated: ReentryStatus = {
            ...parsed,
            schemaVersion: '1.1',
            milestone: parsed.milestone ?? null,
            roadmapFile: defaultRoadmapPath
          };
          await fileManager.writeStatusJson(cfg, migrated);
          return { cfg, status: migrated };
        }
        const normalized: ReentryStatus = {
          ...parsed,
          schemaVersion: '1.1',
          roadmapFile: parsed.roadmapFile || defaultRoadmapPath,
        };
        return { cfg, status: normalized };
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
        roadmapFile: defaultRoadmapPath,

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
      return { cfg, status: initial };
    };

    // ─────────────────────────────────────────────
    //  REENTRY COMMANDS
    // ─────────────────────────────────────────────

    program
      .command('reentry')
      .description('Manage re-entry status (fast layer)')
      .addCommand(
        new Command('init')
          .description('Initialize re-entry status files')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('-p, --project <name>', 'project scope (separate ROADMAP/REENTRY/status per project)')
          .option('--migrate', 'rewrite v1.0 schema to v1.1 (no semantic changes)', false)
          .action(async (options) => {
            const { status } = await ensureReentryInitialized(options.config, Boolean(options.migrate), options.project);
            console.log(`✅ Initialized re-entry status (schema ${status.schemaVersion})`);
          })
      )
      .addCommand(
        new Command('set')
          .description('Update re-entry status fields (fast layer)')
          .option('--phase <phase>', 'Set current phase')
          .option('--next <text>', 'Set next micro-step (replaces first nextSteps entry)')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('-p, --project <name>', 'project scope (separate ROADMAP/REENTRY/status per project)')
          .option('--migrate', 'rewrite v1.0 schema to v1.1 (no semantic changes)', false)
          .action(async (options) => {
            const { cfg, status } = await ensureReentryInitialized(options.config, Boolean(options.migrate), options.project);

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
        new Command('update')
          .description('Auto-fill re-entry status from last commit and current version (smart reentry)')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('-p, --project <name>', 'project scope')
          .option('--phase <phase>', 'Override inferred phase')
          .option('--next <text>', 'Override suggested next step')
          .option('--dry-run', 'Show what would be updated without writing', false)
          .action(async (options) => {
            const { cfg, status } = await ensureReentryInitialized(options.config, false, options.project);

            // Auto-collect git context
            const gitCtx = await collectGitContext();

            // Read current version from package.json
            let currentVersion = status.versioning.currentVersion;
            try {
              const rootPkg = await fs.readJson('package.json');
              currentVersion = rootPkg.version || currentVersion;
            } catch { /* keep existing */ }

            // Infer phase or use override
            const phase = options.phase || inferPhase(gitCtx, currentVersion);

            // Suggest next step or use override
            const nextStep = options.next || suggestNextStep(gitCtx);

            const updated: ReentryStatus = {
              ...status,
              schemaVersion: '1.1',
              version: currentVersion,
              currentPhase: phase as any,
              nextSteps: [{ id: 'next', description: nextStep, priority: 1 }],
              context: {
                trigger: 'auto',
                command: 'versioning reentry update',
                gitInfo: {
                  branch: gitCtx.branch,
                  commit: gitCtx.commit,
                  author: gitCtx.author,
                  timestamp: gitCtx.timestamp,
                },
                versioningInfo: {
                  newVersion: currentVersion,
                },
              },
              versioning: {
                ...status.versioning,
                currentVersion: currentVersion,
                previousVersion: status.versioning.currentVersion !== currentVersion
                  ? status.versioning.currentVersion
                  : status.versioning.previousVersion,
              },
              lastUpdated: new Date().toISOString(),
              updatedBy: gitCtx.author || 'auto',
            };

            if (options.dryRun) {
              console.log('\n📋 Re-entry Update Preview (dry-run)\n');
              console.log(`  Branch:       ${gitCtx.branch}`);
              console.log(`  Commit:       ${gitCtx.commit}`);
              console.log(`  Message:      ${gitCtx.commitMessage}`);
              console.log(`  Author:       ${gitCtx.author}`);
              console.log(`  Version:      ${currentVersion}`);
              console.log(`  Phase:        ${phase}`);
              console.log(`  Next step:    ${nextStep}`);
              console.log(`  Files changed: ${gitCtx.diffSummary.filesChanged} (+${gitCtx.diffSummary.insertions}/-${gitCtx.diffSummary.deletions})`);
              console.log('\n  Use without --dry-run to apply.\n');
              return;
            }

            await manager.updateStatus(cfg, () => updated);

            console.log('\n📋 Re-entry Status Auto-Updated\n');
            console.log(`  ├─ Branch:       ${gitCtx.branch}`);
            console.log(`  ├─ Commit:       ${gitCtx.commit} — ${gitCtx.commitMessage}`);
            console.log(`  ├─ Version:      ${currentVersion}`);
            console.log(`  ├─ Phase:        ${phase}`);
            console.log(`  ├─ Next step:    ${nextStep}`);
            console.log(`  └─ Updated by:   ${gitCtx.author || 'auto'}\n`);

            console.log('  🔜 Suggested workflow:');
            console.log('     1. Review next step above');
            console.log('     2. Work on the task');
            console.log('     3. Commit & push');
            console.log('     4. Run `versioning reentry update` again\n');
          })
      )
      .addCommand(
        new Command('show')
          .description('Show current re-entry status summary')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('-p, --project <name>', 'project scope')
          .option('--json', 'Output as JSON', false)
          .action(async (options) => {
            const { status } = await ensureReentryInitialized(options.config, false, options.project);

            if (options.json) {
              console.log(JSON.stringify(status, null, 2));
              return;
            }

            const milestoneText = status.milestone
              ? `${status.milestone.title} (${status.milestone.id})`
              : '—';
            const nextStep = status.nextSteps?.[0]?.description ?? '—';
            const gitCommit = status.context?.gitInfo?.commit || '—';
            const gitBranch = status.context?.gitInfo?.branch || '—';

            console.log('\n┌───────────────────────────────────────────┐');
            console.log('│         📋 Re-entry Status Summary         │');
            console.log('├───────────────────────────────────────────┤');
            console.log(`│  Version:     ${status.version.padEnd(28)}│`);
            console.log(`│  Phase:       ${status.currentPhase.padEnd(28)}│`);
            console.log(`│  Branch:      ${gitBranch.padEnd(28)}│`);
            console.log(`│  Commit:      ${gitCommit.padEnd(28)}│`);
            console.log(`│  Milestone:   ${milestoneText.padEnd(28).substring(0, 28)}│`);
            console.log(`│  Next step:   ${nextStep.padEnd(28).substring(0, 28)}│`);
            console.log(`│  Updated:     ${status.lastUpdated.substring(0, 19).padEnd(28)}│`);
            console.log(`│  Roadmap:     ${status.roadmapFile.padEnd(28).substring(0, 28)}│`);
            console.log('└───────────────────────────────────────────┘\n');
          })
      )
      .addCommand(
        new Command('sync')
          .description('Ensure generated status files exist and are up to date (idempotent)')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('-p, --project <name>', 'project scope (separate ROADMAP/REENTRY/status per project)')
          .option('--migrate', 'rewrite v1.0 schema to v1.1 (no semantic changes)', false)
          .action(async (options) => {
            const { cfg, status } = await ensureReentryInitialized(options.config, Boolean(options.migrate), options.project);
            const reentryCfg = ConfigManager.loadConfig(cfg, options.project);

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

    // ─────────────────────────────────────────────
    //  ROADMAP COMMANDS (expanded with project identification)
    // ─────────────────────────────────────────────

    program
      .command('roadmap')
      .description('Manage roadmap/backlog (slow layer)')
      .addCommand(
        new Command('init')
          .description(`Create ${REENTRY_STATUS_DIRNAME}/${ROADMAP_MD_FILENAME} if missing and ensure managed header block`)
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('-p, --project <name>', 'project scope (separate ROADMAP/REENTRY/status per project)')
          .option('-t, --title <title>', 'project title for ROADMAP.md template', 'Untitled')
          .action(async (options) => {
            const projectKey = await validateProjectOption(options.config, options.project);
            const { cfg, status } = await ensureReentryInitialized(options.config, false, projectKey);
            const roadmapPath = status.roadmapFile || RoadmapRenderer.defaultRoadmapPath();

            // If a project is specified and title is left default, prefer a non-stale title.
            const title =
              projectKey && String(options.title).trim() === 'Untitled'
                ? String(options.project ?? projectKey)
                : String(options.title);

            const existing = await fileManager.readFileIfExists(roadmapPath);
            if (!existing) {
              await fileManager.writeFileIfChanged(
                roadmapPath,
                RoadmapRenderer.renderTemplate({ projectTitle: title }, { milestone: status.milestone, roadmapFile: roadmapPath })
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
        new Command('validate')
          .description('Validate that project roadmaps correspond to existing workspaces (detect stale roadmaps)')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .action(async (options) => {
            const { slugs } = await discoverWorkspaceProjects(String(options.config));

            const projectsDir = path.join(path.dirname(String(options.config)), REENTRY_STATUS_DIRNAME, 'projects');
            if (!(await fs.pathExists(projectsDir))) {
              console.log('✅ No project roadmaps found');
              return;
            }

            const entries = await fs.readdir(projectsDir, { withFileTypes: true });
            const stale: string[] = [];

            for (const entry of entries) {
              if (!entry.isDirectory()) continue;
              const key = entry.name;
              if (!slugs.has(key)) {
                stale.push(key);
              }
            }

            if (stale.length === 0) {
              console.log('✅ All project roadmaps match a workspace');
              return;
            }

            console.warn(`⚠️  Stale project roadmaps found (no matching workspace): ${stale.join(', ')}`);
            process.exitCode = 1;
          })
      )
      .addCommand(
        new Command('list')
          .description('List roadmap milestones parsed from ROADMAP.md')
          .option('-c, --config <file>', 'config file path', 'versioning.config.json')
          .option('-p, --project <name>', 'project scope (separate ROADMAP/REENTRY/status per project)')
          .action(async (options) => {
            const { status } = await ensureReentryInitialized(options.config, false, options.project);
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
          .option('-p, --project <name>', 'project scope (separate ROADMAP/REENTRY/status per project)')
          .action(async (options) => {
            const { cfg, status } = await ensureReentryInitialized(options.config, false, options.project);
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
          .option('-p, --project <name>', 'project scope (separate ROADMAP/REENTRY/status per project)')
          .action(async (options) => {
            const { status } = await ensureReentryInitialized(options.config, false, options.project);
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
