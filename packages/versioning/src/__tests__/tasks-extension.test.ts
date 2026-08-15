jest.unmock('fs-extra');

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Command } from 'commander';
import extension from '../extensions/tasks/index';

let tmpDir: string;
let previousCwd: string;

beforeEach(async () => {
  previousCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'versioning-tasks-extension-'));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(previousCwd);
  if (tmpDir && await fs.pathExists(tmpDir)) {
    await fs.remove(tmpDir);
  }
});

async function writeTask(relativePath: string, content: string): Promise<void> {
  const absolutePath = path.join(tmpDir, relativePath);
  await fs.ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, content);
}

async function registerTasks(config: any = {}): Promise<Command> {
  const program = new Command();
  program.exitOverride();
  await extension.register(program, config);
  return program;
}

describe('tasks extension', () => {
  it('registers the expected task command tree', async () => {
    const program = await registerTasks();

    const tasks = program.commands.find((entry) => entry.name() === 'tasks');
    expect(tasks).toBeDefined();
    expect(tasks?.commands.map((command) => command.name())).toEqual(
      expect.arrayContaining(['list', 'add', 'archive', 'sync', 'validate'])
    );
  });

  it('sync writes README indexes and task snapshot metadata', async () => {
    await writeTask('.agents/active-tasks/wallet/00-SPEC.md', `# Wallet Feature

## Goal

- Ship a wallet flow

## Tasks

- [ ] Build the UI

## Acceptance Criteria

- [ ] Users can create a wallet
`);
    await writeTask('.agents/active-tasks/wallet/01-build-ui.md', `# Build UI

Status: active

## Acceptance Criteria

- [ ] The UI renders
`);

    const program = await registerTasks();

    await expect(program.parseAsync(['node', 'versioning', 'tasks', 'sync'])).resolves.toBe(program);

    const readme = await fs.readFile(path.join(tmpDir, '.agents/active-tasks/wallet/README.md'), 'utf8');
    expect(readme).toContain('# wallet');
    expect(readme).toContain('00-SPEC.md');

    const reentryJson = await fs.readFile(path.join(tmpDir, '.versioning', 'reentry.status.json'), 'utf8');
    expect(reentryJson).toContain('"workspaceTasks"');
    expect(reentryJson).toContain('"snapshotHash"');

    const reentryMarkdown = await fs.readFile(path.join(tmpDir, '.versioning', 'REENTRY.md'), 'utf8');
    expect(reentryMarkdown).toContain('Tasks snapshot:');
  });

  it('writes a project-scoped task snapshot to the selected extension config paths', async () => {
    await writeTask('.agents/active-tasks/wallet/01-build-ui.md', '# Build UI\n\nStatus: active\n');
    await fs.writeJson(path.join(tmpDir, 'versioning.config.json'), {
      extensionConfig: {
        'reentry-status': {
          projects: {
            wallet: {}
          }
        }
      }
    });

    const program = await registerTasks();
    await expect(program.parseAsync(['node', 'versioning', 'tasks', 'sync', '--project', 'wallet'])).resolves.toBe(program);

    expect(await fs.pathExists(path.join(tmpDir, '.versioning', 'projects', 'wallet', 'reentry.status.json'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.versioning', 'reentry.status.json'))).toBe(false);
  });

  it('removes generated indexes for task groups that no longer exist', async () => {
    const taskPath = '.agents/active-tasks/wallet/01-build-ui.md';
    await writeTask(taskPath, '# Build UI\n\nStatus: active\n');
    const program = await registerTasks();

    await program.parseAsync(['node', 'versioning', 'tasks', 'sync']);
    const readmePath = path.join(tmpDir, '.agents', 'active-tasks', 'wallet', 'README.md');
    expect(await fs.pathExists(readmePath)).toBe(true);

    await fs.remove(path.join(tmpDir, taskPath));
    await program.parseAsync(['node', 'versioning', 'tasks', 'sync']);
    expect(await fs.pathExists(readmePath)).toBe(false);
  });
});
