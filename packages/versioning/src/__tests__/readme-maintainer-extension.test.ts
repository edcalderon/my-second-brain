// Unmock fs-extra since readme-maintainer tests need real filesystem access
jest.unmock('fs-extra');

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Command } from 'commander';
import extension from '../extensions/readme-maintainer/index';

let tmpDir: string;
let previousCwd: string;

const CHANGELOG_CONTENT = `# Changelog

## [1.2.3] - 2024-01-01

### Added
- New feature

### Fixed
- Bug fix
`;

const README_CONTENT = `# My Project

## 📋 Latest Changes

Old content here.

## Other Section
`;

beforeEach(async () => {
  previousCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'readme-maintainer-test-'));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(previousCwd);
  if (tmpDir && await fs.pathExists(tmpDir)) {
    await fs.remove(tmpDir);
  }
});

async function runUpdateReadme(args: string[]): Promise<void> {
  const program = new Command();
  program.exitOverride();
  await extension.register(program, {});
  await program.parseAsync(['node', 'versioning', 'update-readme', ...args]);
}

describe('readme-maintainer extension', () => {
  it('exports a VersioningExtension-compatible shape', () => {
    expect(extension).toBeDefined();
    expect(extension.name).toBe('readme-maintainer');
    expect(typeof extension.description).toBe('string');
    expect(typeof extension.version).toBe('string');
    expect(typeof extension.register).toBe('function');
  });

  it('generates a relative CHANGELOG link when relative paths are provided', async () => {
    const readmePath = path.join(tmpDir, 'README.md');
    const changelogPath = path.join(tmpDir, 'CHANGELOG.md');

    await fs.writeFile(readmePath, README_CONTENT);
    await fs.writeFile(changelogPath, CHANGELOG_CONTENT);

    await runUpdateReadme([
      '--readme', readmePath,
      '--changelog', changelogPath,
    ]);

    const result = await fs.readFile(readmePath, 'utf8');
    expect(result).toContain('[CHANGELOG.md](./CHANGELOG.md)');
    expect(result).not.toContain(tmpDir);
  });

  it('generates a correct relative link when CHANGELOG is in a subdirectory', async () => {
    const readmePath = path.join(tmpDir, 'README.md');
    const subDir = path.join(tmpDir, 'docs');
    await fs.ensureDir(subDir);
    const changelogPath = path.join(subDir, 'CHANGELOG.md');

    await fs.writeFile(readmePath, README_CONTENT);
    await fs.writeFile(changelogPath, CHANGELOG_CONTENT);

    await runUpdateReadme([
      '--readme', readmePath,
      '--changelog', changelogPath,
    ]);

    const result = await fs.readFile(readmePath, 'utf8');
    expect(result).toContain('[CHANGELOG.md](./docs/CHANGELOG.md)');
    expect(result).not.toContain(tmpDir);
  });

  it('generates a correct relative link when CHANGELOG is in a parent directory', async () => {
    const subDir = path.join(tmpDir, 'packages', 'myapp');
    await fs.ensureDir(subDir);
    const readmePath = path.join(subDir, 'README.md');
    const changelogPath = path.join(tmpDir, 'CHANGELOG.md');

    await fs.writeFile(readmePath, README_CONTENT);
    await fs.writeFile(changelogPath, CHANGELOG_CONTENT);

    await runUpdateReadme([
      '--readme', readmePath,
      '--changelog', changelogPath,
    ]);

    const result = await fs.readFile(readmePath, 'utf8');
    expect(result).toContain('[CHANGELOG.md](../../CHANGELOG.md)');
    expect(result).not.toContain(tmpDir);
  });

  it('does not embed absolute paths in the README when absolute paths are passed', async () => {
    const readmePath = path.join(tmpDir, 'README.md');
    const changelogPath = path.join(tmpDir, 'CHANGELOG.md');

    await fs.writeFile(readmePath, README_CONTENT);
    await fs.writeFile(changelogPath, CHANGELOG_CONTENT);

    // Pass absolute paths explicitly (simulates monorepo wrapper scripts)
    await runUpdateReadme([
      '--readme', readmePath,
      '--changelog', changelogPath,
    ]);

    const result = await fs.readFile(readmePath, 'utf8');
    // The link must NOT contain an absolute filesystem path
    expect(result).not.toMatch(/\(\/[^)]+\)/);
    // It must use a proper relative markdown link
    expect(result).toContain('[CHANGELOG.md](./CHANGELOG.md)');
  });

  it('uses the installed project repository when generating the releases link', async () => {
    const readmePath = path.join(tmpDir, 'README.md');
    const changelogPath = path.join(tmpDir, 'CHANGELOG.md');
    const pkgPath = path.join(tmpDir, 'package.json');

    await fs.writeFile(readmePath, README_CONTENT);
    await fs.writeFile(changelogPath, CHANGELOG_CONTENT);
    await fs.writeJson(pkgPath, {
      name: 'consumer-project',
      version: '1.2.3',
      repository: {
        type: 'git',
        url: 'git+https://github.com/acme/widget-kit.git',
      },
    });

    await runUpdateReadme([
      '--readme', readmePath,
      '--changelog', changelogPath,
      '--pkg', pkgPath,
    ]);

    const result = await fs.readFile(readmePath, 'utf8');
    expect(result).toContain('https://github.com/acme/widget-kit/releases');
    expect(result).not.toContain('my-second-brain');
  });

  it('falls back to a generic changelog-only line when no repository can be resolved', async () => {
    const readmePath = path.join(tmpDir, 'README.md');
    const changelogPath = path.join(tmpDir, 'CHANGELOG.md');
    const pkgPath = path.join(tmpDir, 'package.json');

    const previousRepositoryEnv = process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_REPOSITORY;

    try {
      await fs.writeFile(readmePath, README_CONTENT);
      await fs.writeFile(changelogPath, CHANGELOG_CONTENT);
      await fs.writeJson(pkgPath, {
        name: 'consumer-project',
        version: '1.2.3',
      });

      await runUpdateReadme([
        '--readme', readmePath,
        '--changelog', changelogPath,
        '--pkg', pkgPath,
      ]);

      const result = await fs.readFile(readmePath, 'utf8');
      expect(result).toContain('[CHANGELOG.md](./CHANGELOG.md)');
      expect(result).not.toContain('releases');
    } finally {
      if (previousRepositoryEnv === undefined) {
        delete process.env.GITHUB_REPOSITORY;
      } else {
        process.env.GITHUB_REPOSITORY = previousRepositoryEnv;
      }
    }
  });
});
