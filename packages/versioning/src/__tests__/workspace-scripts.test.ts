// Unmock fs-extra since workspace-scripts tests need real filesystem access
jest.unmock('fs-extra');

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
  generateWorkspaceScripts,
  syncScriptsToPackageJson,
  detectNewApps,
  WorkspaceScriptsConfig,
} from '../extensions/workspace-scripts/index';

// Use a temp directory for each test
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ws-scripts-test-'));
});

afterEach(async () => {
  if (tmpDir && await fs.pathExists(tmpDir)) {
    await fs.remove(tmpDir);
  }
});

// ─────────────────────────────────────────────────────────────────
//  generateWorkspaceScripts
// ─────────────────────────────────────────────────────────────────

describe('generateWorkspaceScripts', () => {
  it('generates dev:all with concurrently for multiple apps', async () => {
    // Create mock app package.json files
    await fs.ensureDir(path.join(tmpDir, 'apps/dashboard'));
    await fs.writeJson(path.join(tmpDir, 'apps/dashboard/package.json'), { name: '@ed/dashboard' });
    await fs.ensureDir(path.join(tmpDir, 'apps/docs'));
    await fs.writeJson(path.join(tmpDir, 'apps/docs/package.json'), { name: '@ed/docs' });

    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: {
        'apps/dashboard': { command: 'dev', args: '-p 3000' },
        'apps/docs': { command: 'start', args: '--port 3001' },
      },
      individualScripts: true,
      buildScripts: true,
      runner: 'concurrently',
      autoDetect: true,
    };

    const result = await generateWorkspaceScripts(tmpDir, config);

    expect(result.scripts['dev:all']).toContain('concurrently');
    expect(result.scripts['dev:all']).toContain('@ed/dashboard');
    expect(result.scripts['dev:all']).toContain('@ed/docs');
    expect(result.scripts['dev:dashboard']).toBe('pnpm --filter @ed/dashboard dev -p 3000');
    expect(result.scripts['dev:docs']).toBe('pnpm --filter @ed/docs start --port 3001');
    expect(result.scripts['build']).toBe('pnpm --recursive build');
    expect(result.scripts['build:all']).toBe('pnpm --recursive build');
    expect(result.scripts['build:dashboard']).toBe('pnpm --filter @ed/dashboard build');
    expect(result.scripts['build:docs']).toBe('pnpm --filter @ed/docs build');
  });

  it('generates turbo-based dev:all when runner is turbo', async () => {
    await fs.ensureDir(path.join(tmpDir, 'apps/api'));
    await fs.writeJson(path.join(tmpDir, 'apps/api/package.json'), { name: '@aq/api' });

    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: {
        'apps/api': { command: 'dev' },
      },
      individualScripts: true,
      buildScripts: true,
      runner: 'turbo',
      autoDetect: false,
    };

    const result = await generateWorkspaceScripts(tmpDir, config);
    expect(result.scripts['dev:all']).toBe('turbo run dev');
    expect(result.scripts['build:all']).toBe('turbo run build');
  });

  it('skips disabled apps', async () => {
    await fs.ensureDir(path.join(tmpDir, 'apps/a'));
    await fs.writeJson(path.join(tmpDir, 'apps/a/package.json'), { name: '@test/a' });
    await fs.ensureDir(path.join(tmpDir, 'apps/b'));
    await fs.writeJson(path.join(tmpDir, 'apps/b/package.json'), { name: '@test/b' });

    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: {
        'apps/a': { command: 'dev' },
        'apps/b': { command: 'dev', enabled: false },
      },
      individualScripts: true,
      buildScripts: true,
      runner: 'concurrently',
      autoDetect: false,
    };

    const result = await generateWorkspaceScripts(tmpDir, config);
    expect(result.scripts['dev:a']).toBeDefined();
    expect(result.scripts['dev:b']).toBeUndefined();
  });

  it('skips individual scripts when individualScripts is false', async () => {
    await fs.ensureDir(path.join(tmpDir, 'apps/app1'));
    await fs.writeJson(path.join(tmpDir, 'apps/app1/package.json'), { name: '@test/app1' });

    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: { 'apps/app1': { command: 'dev' } },
      individualScripts: false,
      buildScripts: false,
      runner: 'concurrently',
      autoDetect: false,
    };

    const result = await generateWorkspaceScripts(tmpDir, config);
    expect(result.scripts['dev:all']).toBeDefined();
    expect(result.scripts['dev']).toBeDefined();
    expect(result.scripts['dev:app1']).toBeUndefined();
    expect(result.scripts['build:app1']).toBeUndefined();
  });

  it('uses explicit filter when provided', async () => {
    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: {
        'apps/dashboard': { filter: '@custom/dashboard', command: 'dev', args: '-p 4000' },
      },
      individualScripts: true,
      buildScripts: false,
      runner: 'concurrently',
      autoDetect: false,
    };

    const result = await generateWorkspaceScripts(tmpDir, config);
    expect(result.scripts['dev:dashboard']).toBe('pnpm --filter @custom/dashboard dev -p 4000');
  });

  it('returns empty when no apps configured', async () => {
    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: {},
      individualScripts: true,
      buildScripts: true,
      runner: 'concurrently',
      autoDetect: false,
    };

    const result = await generateWorkspaceScripts(tmpDir, config);
    expect(Object.keys(result.scripts)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────
//  syncScriptsToPackageJson
// ─────────────────────────────────────────────────────────────────

describe('syncScriptsToPackageJson', () => {
  it('adds new scripts to package.json', async () => {
    await fs.writeJson(path.join(tmpDir, 'package.json'), {
      name: 'test',
      scripts: { test: 'jest' },
    });

    const generated = {
      scripts: { 'dev:all': 'concurrently "a" "b"', 'dev:app': 'pnpm --filter app dev' },
      summary: [],
    };

    const result = await syncScriptsToPackageJson(tmpDir, generated);
    expect(result.added).toContain('dev:all');
    expect(result.added).toContain('dev:app');

    const pkg = await fs.readJson(path.join(tmpDir, 'package.json'));
    expect(pkg.scripts['dev:all']).toBe('concurrently "a" "b"');
    expect(pkg.scripts['test']).toBe('jest'); // untouched
  });

  it('updates changed scripts', async () => {
    await fs.writeJson(path.join(tmpDir, 'package.json'), {
      name: 'test',
      scripts: {
        'dev:all': 'old command',
        __workspace_scripts_managed: '["dev:all"]',
      },
    });

    const generated = {
      scripts: { 'dev:all': 'new command' },
      summary: [],
    };

    const result = await syncScriptsToPackageJson(tmpDir, generated);
    expect(result.updated).toContain('dev:all');
  });

  it('removes scripts no longer generated', async () => {
    await fs.writeJson(path.join(tmpDir, 'package.json'), {
      name: 'test',
      scripts: {
        'dev:old': 'old',
        'dev:new': 'new',
        __workspace_scripts_managed: '["dev:old","dev:new"]',
      },
    });

    const generated = {
      scripts: { 'dev:new': 'new' },
      summary: [],
    };

    const result = await syncScriptsToPackageJson(tmpDir, generated);
    expect(result.removed).toContain('dev:old');

    const pkg = await fs.readJson(path.join(tmpDir, 'package.json'));
    expect(pkg.scripts['dev:old']).toBeUndefined();
  });

  it('dry run does not write changes', async () => {
    await fs.writeJson(path.join(tmpDir, 'package.json'), {
      name: 'test',
      scripts: {},
    });

    const generated = {
      scripts: { 'dev:all': 'something' },
      summary: [],
    };

    const result = await syncScriptsToPackageJson(tmpDir, generated, true);
    expect(result.added).toContain('dev:all');

    const pkg = await fs.readJson(path.join(tmpDir, 'package.json'));
    expect(pkg.scripts['dev:all']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
//  detectNewApps
// ─────────────────────────────────────────────────────────────────

describe('detectNewApps', () => {
  it('detects apps listed in pnpm-workspace.yaml but not in config', async () => {
    // Create workspace yaml
    await fs.writeFile(
      path.join(tmpDir, 'pnpm-workspace.yaml'),
      'packages:\n  - apps/*\n  - packages/*\n'
    );

    // Create apps
    await fs.ensureDir(path.join(tmpDir, 'apps/dashboard'));
    await fs.writeJson(path.join(tmpDir, 'apps/dashboard/package.json'), { name: '@ed/dashboard' });
    await fs.ensureDir(path.join(tmpDir, 'apps/new-app'));
    await fs.writeJson(path.join(tmpDir, 'apps/new-app/package.json'), { name: '@ed/new-app' });

    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: { 'apps/dashboard': { command: 'dev' } },
      individualScripts: true,
      buildScripts: true,
      runner: 'concurrently',
      autoDetect: true,
    };

    const newApps = await detectNewApps(tmpDir, config);
    expect(newApps).toContain('apps/new-app');
    expect(newApps).not.toContain('apps/dashboard');
  });

  it('returns empty when all apps are tracked', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'pnpm-workspace.yaml'),
      'packages:\n  - apps/*\n'
    );

    await fs.ensureDir(path.join(tmpDir, 'apps/dashboard'));
    await fs.writeJson(path.join(tmpDir, 'apps/dashboard/package.json'), { name: '@ed/dashboard' });

    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: { 'apps/dashboard': { command: 'dev' } },
      individualScripts: true,
      buildScripts: true,
      runner: 'concurrently',
      autoDetect: true,
    };

    const newApps = await detectNewApps(tmpDir, config);
    expect(newApps).toHaveLength(0);
  });

  it('ignores directories without package.json', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'pnpm-workspace.yaml'),
      'packages:\n  - apps/*\n'
    );

    // Create a directory without package.json
    await fs.ensureDir(path.join(tmpDir, 'apps/not-a-package'));

    const config: WorkspaceScriptsConfig = {
      enabled: true,
      apps: {},
      individualScripts: true,
      buildScripts: true,
      runner: 'concurrently',
      autoDetect: true,
    };

    const newApps = await detectNewApps(tmpDir, config);
    expect(newApps).not.toContain('apps/not-a-package');
  });
});
