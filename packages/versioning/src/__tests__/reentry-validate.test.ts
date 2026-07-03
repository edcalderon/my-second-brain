jest.unmock('fs-extra');

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Command } from 'commander';
import extension from '../extensions/reentry-status/index';
import { StatusRenderer } from '../extensions/reentry-status/status-renderer';

let tmpDir: string;
let previousCwd: string;

beforeEach(async () => {
  previousCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'versioning-reentry-validate-'));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(previousCwd);
  if (tmpDir && await fs.pathExists(tmpDir)) {
    await fs.remove(tmpDir);
  }
});

describe('reentry validate command', () => {
  it('registers the validate command', async () => {
    const program = new Command();
    await extension.register(program, {});

    const reentry = program.commands.find((entry) => entry.name() === 'reentry');
    expect(reentry?.commands.map((command) => command.name())).toEqual(
      expect.arrayContaining(['init', 'set', 'update', 'show', 'sync', 'validate'])
    );
  });

  it('accepts matching JSON and markdown status files', async () => {
    const status = {
      schemaVersion: '1.1',
      version: '1.5.11',
      lastUpdated: '2026-07-03T00:00:00.000Z',
      updatedBy: 'codex',
      context: {
        trigger: 'manual',
        gitInfo: {
          branch: 'main',
          commit: 'abc123',
          author: 'Codex',
          timestamp: '2026-07-03T00:00:00.000Z'
        },
        versioningInfo: {}
      },
      milestone: null,
      roadmapFile: '.versioning/ROADMAP.md',
      currentPhase: 'planning',
      milestones: [],
      blockers: [],
      nextSteps: [],
      risks: [],
      dependencies: [],
      versioning: {
        currentVersion: '1.5.11',
        previousVersion: '1.5.10',
        versionType: 'patch'
      },
      syncMetadata: {
        lastSyncAttempt: '2026-07-03T00:00:00.000Z',
        lastSuccessfulSync: '2026-07-03T00:00:00.000Z'
      }
    };

    await fs.ensureDir(path.join(tmpDir, '.versioning'));
    await fs.writeFile(path.join(tmpDir, '.versioning/reentry.status.json'), StatusRenderer.renderJson(status as any));
    await fs.writeFile(path.join(tmpDir, '.versioning/REENTRY.md'), StatusRenderer.renderMarkdown(status as any));

    const program = new Command();
    program.exitOverride();
    await extension.register(program, {});

    await expect(program.parseAsync(['node', 'versioning', 'reentry', 'validate'])).resolves.toBe(program);
  });
});
