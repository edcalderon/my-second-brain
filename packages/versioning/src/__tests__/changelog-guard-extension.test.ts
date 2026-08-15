jest.unmock('fs-extra');

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Command } from 'commander';
import extension from '../extensions/changelog-guard/index';

let tmpDir: string;
let previousCwd: string;

beforeEach(async () => {
  previousCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'versioning-changelog-guard-'));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(previousCwd);
  if (tmpDir && await fs.pathExists(tmpDir)) {
    await fs.remove(tmpDir);
  }
});

describe('changelog-guard extension', () => {
  it('registers a check-changelog command', async () => {
    const program = new Command();
    await extension.register(program, {});

    const command = program.commands.find((entry) => entry.name() === 'check-changelog');
    expect(command).toBeDefined();
    expect(command?.options.map((option) => option.flags)).toEqual(expect.arrayContaining([
      '--changelog <file>',
      '--version <semver>',
      '--allow-empty'
    ]));
  });

  it('validates a changelog file successfully', async () => {
    await fs.writeFile(path.join(tmpDir, 'CHANGELOG.md'), `# Changelog

## [1.5.11] - 2026-07-03

### Added
- New tasks plugin
`);

    const program = new Command();
    program.exitOverride();
    await extension.register(program, {});

    await expect(program.parseAsync([
      'node',
      'versioning',
      'check-changelog',
      '--changelog',
      'CHANGELOG.md'
    ])).resolves.toBe(program);
  });
});
