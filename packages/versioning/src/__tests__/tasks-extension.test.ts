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

describe('tasks extension', () => {
  it('registers the expected task command tree', async () => {
    const program = new Command();
    await extension.register(program, {});

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

    const program = new Command();
    program.exitOverride();
    await extension.register(program, {});

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

  it('sync -p <project> writes to the project-scoped reentry files, not the root ones', async () => {
    // Regression test for a real bug: resolveReentryConfig() computed the
    // correct project-scoped file paths via ConfigManager.loadConfig(raw,
    // project), but wrote them under the legacy `reentryStatus` fallback
    // key instead of `extensionConfig['reentry-status']`. Since
    // ReentryStatusManager.updateStatus() re-derives config via
    // ConfigManager.loadConfig(cfg) -- with NO project argument, because it
    // only has the merged config object to work from -- and that resolution
    // always prefers extensionConfig over the fallback, the project-scoped
    // paths were silently discarded and status got written to the root
    // .versioning/ files every time, regardless of -p.
    //
    // This requires an existing (even empty) extensionConfig['reentry-status']
    // entry in versioning.config.json to actually reproduce -- that's what
    // makes the fallback key lose the priority fight in the buggy version.
    // Without it, `cfg.extensionConfig` stays undefined either way and the
    // bug can't manifest, which is exactly why it slipped through review.
    await fs.writeJson(path.join(tmpDir, 'versioning.config.json'), {
      extensionConfig: { 'reentry-status': {} }
    });

    await writeTask('.agents/active-tasks/wallet/00-SPEC.md', `# Wallet Feature

## Goal

- Ship a wallet flow

## Tasks

- [ ] Build the UI
`);

    const program = new Command();
    program.exitOverride();
    await extension.register(program, {});

    await expect(
      program.parseAsync(['node', 'versioning', 'tasks', 'sync', '-p', 'wallet'])
    ).resolves.toBe(program);

    // Project-scoped files (ConfigManager's default project layout) must exist...
    const projectJsonPath = path.join(tmpDir, '.versioning', 'projects', 'wallet', 'reentry.status.json');
    expect(await fs.pathExists(projectJsonPath)).toBe(true);
    const projectJson = await fs.readFile(projectJsonPath, 'utf8');
    expect(projectJson).toContain('"workspaceTasks"');

    // ...and the root-level files must NOT have been written instead.
    const rootJsonPath = path.join(tmpDir, '.versioning', 'reentry.status.json');
    expect(await fs.pathExists(rootJsonPath)).toBe(false);
  });
});
