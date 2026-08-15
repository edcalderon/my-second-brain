import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';

import { VersioningExtension } from '../../extensions';
import { ConfigManager } from '../reentry-status/config-manager';
import { FileManager } from '../reentry-status/file-manager';
import { ReentryStatus } from '../reentry-status/models';
import { ReentryStatusManager } from '../reentry-status/reentry-status-manager';
import {
  archiveTaskFile,
  buildTaskSyncMetadata,
  createSpecTemplate,
  createTaskTemplate,
  renderTaskReadmeMap,
  scanTaskWorkspace,
  validateTaskWorkspace
} from './core';

const fileManager = new FileManager();
const statusManager = new ReentryStatusManager({ fileManager });

async function loadRootConfig(configPath: string): Promise<any> {
  if (!(await fs.pathExists(configPath))) return {};
  return await fs.readJson(configPath);
}

async function resolveReentryConfig(configPath: string, project?: string): Promise<{ cfg: any; rootDir: string }> {
  const rawConfig = await loadRootConfig(configPath);
  const rootDir = path.dirname(path.resolve(configPath));
  const reentryConfig = ConfigManager.loadConfig(rawConfig, project);

  return {
    cfg: {
      ...rawConfig,
      reentryStatus: {
        ...((rawConfig as any).reentryStatus ?? {}),
        files: reentryConfig.files
      }
    },
    rootDir
  };
}

async function syncTaskSnapshot(configPath: string, project?: string): Promise<void> {
  const { cfg, rootDir } = await resolveReentryConfig(configPath, project);
  const snapshot = await scanTaskWorkspace(rootDir);
  const readmes = renderTaskReadmeMap(snapshot);

  for (const [readmePath, content] of readmes.entries()) {
    await fileManager.writeFileIfChanged(readmePath, content);
  }

  const metadata = buildTaskSyncMetadata(snapshot);
  await statusManager.updateStatus(cfg, (current) => ({
    ...current,
    schemaVersion: '1.1',
    workspaceTasks: metadata,
    lastUpdated: new Date().toISOString()
  }) as ReentryStatus);
}

function printTaskListRows(rows: Array<Record<string, string>>): void {
  if (rows.length === 0) {
    console.log('— No tasks found');
    return;
  }

  console.table(rows);
}

function taskFileTemplate(targetPath: string, title?: string, status = 'active'): string {
  if (path.basename(targetPath).toUpperCase() === '00-SPEC.MD') {
    return createSpecTemplate(path.basename(path.dirname(targetPath)), title);
  }

  return createTaskTemplate(path.basename(targetPath), title, status);
}

async function writeTaskTemplate(filePath: string, options: { title?: string; status?: string }): Promise<void> {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : normalized.startsWith('.agents/')
    ? path.resolve(process.cwd(), normalized)
    : path.resolve(process.cwd(), '.agents', normalized);
  if (await fs.pathExists(absolutePath)) {
    console.log(`ℹ️  ${path.relative(process.cwd(), absolutePath)} already exists`);
    return;
  }

  await fs.ensureDir(path.dirname(absolutePath));
  const template = taskFileTemplate(absolutePath, options.title, options.status ?? 'active');
  await fs.writeFile(absolutePath, template, 'utf8');
}

const extension: VersioningExtension = {
  name: 'tasks',
  description: 'Manage .agents task tracking folders and reentry sync',
  version: '1.0.0',

  register: async (program: Command) => {
    const tasks = program.command('tasks').description('Manage .agents task tracking folders');

    tasks
      .command('list')
      .description('List tasks from .agents/active-tasks, .agents/pending-tasks, and .agents/done-tasks')
      .option('--feature <name>', 'Filter by feature folder')
      .option('--status <category>', 'Filter by category (active, pending, done)')
      .option('--json', 'Output JSON instead of a table', false)
      .action(async (options) => {
        const snapshot = await scanTaskWorkspace(process.cwd());
        const rows = snapshot.entries
          .filter((entry) => !options.feature || entry.feature === String(options.feature))
          .filter((entry) => !options.status || entry.category === String(options.status))
          .map((entry) => ({
            category: entry.category,
            feature: entry.feature,
            file: entry.fileName,
            kind: entry.isSpec ? 'spec' : 'task',
            title: entry.title
          }));

        if (options.json) {
          console.log(JSON.stringify({ counts: snapshot.counts, rows }, null, 2));
          return;
        }

        printTaskListRows(rows);
      });

    tasks
      .command('add')
      .description('Create a new task file or feature spec template')
      .argument('<file>', 'Path to the task file relative to the repository root')
      .option('--title <title>', 'Override the derived title')
      .option('--status <status>', 'Initial task status', 'active')
      .option('-c, --config <file>', 'config file path', 'versioning.config.json')
      .option('-p, --project <name>', 'project scope (optional)')
      .action(async (file, options) => {
        try {
          await writeTaskTemplate(file, {
            title: options.title,
            status: options.status
          });
          await syncTaskSnapshot(options.config, options.project);
          console.log(`✅ Created ${file}`);
        } catch (error) {
          console.error('❌ Failed to create task:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });

    tasks
      .command('archive')
      .description('Move a task file from active/pending into done-tasks and refresh indexes')
      .argument('<file>', 'Path to the task file relative to the repository root')
      .option('-c, --config <file>', 'config file path', 'versioning.config.json')
      .option('-p, --project <name>', 'project scope (optional)')
      .action(async (file, options) => {
        try {
          const rootDir = process.cwd();
          await archiveTaskFile(rootDir, file);
          await syncTaskSnapshot(options.config, options.project);
          console.log(`✅ Archived ${file}`);
        } catch (error) {
          console.error('❌ Failed to archive task:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });

    tasks
      .command('sync')
      .description('Regenerate feature README indexes and update the reentry task snapshot')
      .option('-c, --config <file>', 'config file path', 'versioning.config.json')
      .option('-p, --project <name>', 'project scope (optional)')
      .action(async (options) => {
        try {
          await syncTaskSnapshot(options.config, options.project);
          console.log('✅ Task workspace synchronized');
        } catch (error) {
          console.error('❌ Task sync failed:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });

    tasks
      .command('validate')
      .description('Validate task indexes, feature specs, and reentry snapshot metadata')
      .option('-c, --config <file>', 'config file path', 'versioning.config.json')
      .option('-p, --project <name>', 'project scope (optional)')
      .action(async (options) => {
        try {
          const { cfg, rootDir } = await resolveReentryConfig(options.config, options.project);
          const result = await validateTaskWorkspace(rootDir, {
            statusJsonPath: cfg.reentryStatus.files.jsonPath,
            statusMarkdownPath: cfg.reentryStatus.files.markdownPath
          });

          if (!result.ok) {
            for (const error of result.errors) {
              console.error(`❌ ${error}`);
            }
            process.exit(1);
          }

          console.log('✅ Task workspace is in sync');
        } catch (error) {
          console.error('❌ Task validation failed:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });
  }
};

export default extension;
