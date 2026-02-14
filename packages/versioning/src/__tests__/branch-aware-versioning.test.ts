import * as fs from 'fs-extra';
import simpleGit from 'simple-git';
import { VersionManager, VersionConfig } from '../versioning';

type JsonStore = Map<string, unknown>;
type TextStore = Map<string, string>;

const fsMock = fs as jest.Mocked<typeof fs>;
const simpleGitMock = simpleGit as unknown as jest.Mock;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setupMockFilesystem(initialJsonFiles: Record<string, unknown>, initialTextFiles: Record<string, string> = {}) {
  const jsonStore: JsonStore = new Map(
    Object.entries(initialJsonFiles).map(([filePath, content]) => [filePath, clone(content)])
  );
  const textStore: TextStore = new Map(Object.entries(initialTextFiles));

  fsMock.pathExists.mockImplementation(async (filePath) => {
    const normalizedPath = String(filePath);
    return jsonStore.has(normalizedPath) || textStore.has(normalizedPath);
  });

  fsMock.readJson.mockImplementation(async (filePath) => {
    const normalizedPath = String(filePath);
    if (!jsonStore.has(normalizedPath)) {
      throw new Error(`ENOENT: ${normalizedPath}`);
    }
    return clone(jsonStore.get(normalizedPath));
  });

  fsMock.writeJson.mockImplementation(async (filePath, content) => {
    jsonStore.set(String(filePath), clone(content));
  });

  fsMock.readFile.mockImplementation(async (filePath) => {
    const normalizedPath = String(filePath);
    if (textStore.has(normalizedPath)) {
      return textStore.get(normalizedPath) as string;
    }
    if (jsonStore.has(normalizedPath)) {
      return JSON.stringify(jsonStore.get(normalizedPath));
    }
    throw new Error(`ENOENT: ${normalizedPath}`);
  });

  fsMock.writeFile.mockImplementation(async (filePath, content) => {
    textStore.set(String(filePath), String(content));
  });

  fsMock.ensureDir.mockResolvedValue(undefined as never);

  return {
    jsonStore,
    textStore,
    readJson: <T>(filePath: string): T => clone(jsonStore.get(filePath) as T)
  };
}

function createConfig(branchAwareness: VersionConfig['branchAwareness']): VersionConfig {
  return {
    rootPackageJson: 'package.json',
    packages: [],
    branchAwareness
  };
}

describe('VersionManager branch-aware versioning', () => {
  const gitClient = {
    revparse: jest.fn(),
    addAnnotatedTag: jest.fn(),
    add: jest.fn(),
    commit: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    simpleGitMock.mockReturnValue(gitClient);
    gitClient.revparse.mockResolvedValue('develop');
  });

  it('updates only development sync files on develop branch', async () => {
    const fileSystem = setupMockFilesystem({
      'package.json': { version: '1.8.172' },
      'version.development.json': { version: '1.8.172-dev.394' },
      'version.production.json': { version: '1.8.172' }
    });

    const manager = new VersionManager(createConfig({
      enabled: true,
      defaultBranch: 'main',
      branches: {
        main: {
          versionFormat: 'semantic',
          tagFormat: 'v{version}',
          syncFiles: ['package.json', 'version.production.json'],
          bumpStrategy: 'semantic'
        },
        develop: {
          versionFormat: 'dev',
          tagFormat: 'v{version}',
          syncFiles: ['version.development.json'],
          bumpStrategy: 'dev-build'
        }
      }
    }));

    const result = await manager.bumpVersionBranchAware('patch', { targetBranch: 'develop' });

    expect(result.version).toBe('1.8.172-dev.395');
    expect(result.matchPattern).toBe('develop');
    expect(result.syncFiles).toEqual(['version.development.json']);
    expect(fileSystem.readJson<{ version: string }>('package.json').version).toBe('1.8.172');
    expect(fileSystem.readJson<{ version: string }>('version.production.json').version).toBe('1.8.172');
    expect(fileSystem.readJson<{ version: string }>('version.development.json').version).toBe('1.8.172-dev.395');
  });

  it('creates semantic versions on main and updates configured production files', async () => {
    const fileSystem = setupMockFilesystem({
      'package.json': { version: '1.8.172' },
      'version.development.json': { version: '1.8.172-dev.395' },
      'version.production.json': { version: '1.8.172' }
    });

    const manager = new VersionManager(createConfig({
      enabled: true,
      defaultBranch: 'main',
      branches: {
        main: {
          versionFormat: 'semantic',
          tagFormat: 'v{version}',
          syncFiles: ['package.json', 'version.production.json'],
          bumpStrategy: 'semantic'
        }
      }
    }));

    const result = await manager.bumpVersionBranchAware('patch', { targetBranch: 'main' });

    expect(result.version).toBe('1.8.173');
    expect(fileSystem.readJson<{ version: string }>('package.json').version).toBe('1.8.173');
    expect(fileSystem.readJson<{ version: string }>('version.production.json').version).toBe('1.8.173');
    expect(fileSystem.readJson<{ version: string }>('version.development.json').version).toBe('1.8.172-dev.395');
  });

  it('matches wildcard branch config for feature branches', async () => {
    const fileSystem = setupMockFilesystem({
      'package.json': { version: '1.8.172' },
      'version.development.json': { version: '1.8.172-feature/old-ui.4' }
    });

    gitClient.revparse.mockResolvedValue('feature/new-ui');

    const manager = new VersionManager(createConfig({
      enabled: true,
      defaultBranch: 'main',
      branches: {
        main: {
          versionFormat: 'semantic',
          tagFormat: 'v{version}',
          syncFiles: ['package.json'],
          bumpStrategy: 'semantic'
        },
        'feature/*': {
          versionFormat: 'feature',
          tagFormat: 'v{version}',
          syncFiles: ['version.development.json'],
          bumpStrategy: 'feature-branch'
        }
      }
    }));

    const result = await manager.bumpVersionBranchAware('patch');

    expect(result.matchPattern).toBe('feature/*');
    expect(result.version).toBe('1.8.172-feature/new-ui.5');
    expect(fileSystem.readJson<{ version: string }>('version.development.json').version).toBe('1.8.172-feature/new-ui.5');
  });

  it('supports forcing branch-aware mode without explicit config', async () => {
    const fileSystem = setupMockFilesystem({
      'package.json': { version: '1.8.172' }
    });

    const manager = new VersionManager({
      rootPackageJson: 'package.json',
      packages: []
    });

    const result = await manager.bumpVersionBranchAware('patch', {
      forceBranchAware: true,
      targetBranch: 'develop'
    });

    expect(result.version).toBe('1.8.172-dev.1');
    expect(result.matchPattern).toBe('develop');
    expect(fileSystem.readJson<{ version: string }>('version.development.json').version).toBe('1.8.172-dev.1');
  });

  it('supports custom format and build overrides', async () => {
    const fileSystem = setupMockFilesystem({
      'package.json': { version: '1.8.172' },
      'version.development.json': { version: '1.8.172-dev.395' }
    });

    const manager = new VersionManager(createConfig({
      enabled: true,
      defaultBranch: 'main',
      branches: {
        develop: {
          versionFormat: 'dev',
          tagFormat: 'v{version}',
          syncFiles: ['version.development.json'],
          bumpStrategy: 'dev-build'
        }
      }
    }));

    const result = await manager.bumpVersionBranchAware('patch', {
      targetBranch: 'develop',
      format: 'dev',
      build: 396
    });

    expect(result.version).toBe('1.8.172-dev.396');
    expect(fileSystem.readJson<{ version: string }>('version.development.json').version).toBe('1.8.172-dev.396');
  });

  it('falls back to default branch config when no branch pattern matches', async () => {
    const fileSystem = setupMockFilesystem({
      'package.json': { version: '1.8.172' },
      'version.production.json': { version: '1.8.172' }
    });

    const manager = new VersionManager(createConfig({
      enabled: true,
      defaultBranch: 'main',
      branches: {
        main: {
          versionFormat: 'semantic',
          tagFormat: 'v{version}',
          syncFiles: ['package.json', 'version.production.json'],
          bumpStrategy: 'semantic'
        },
        'feature/*': {
          versionFormat: 'feature',
          tagFormat: 'v{version}',
          syncFiles: ['version.development.json'],
          bumpStrategy: 'feature-branch'
        }
      }
    }));

    const result = await manager.bumpVersionBranchAware('patch', {
      targetBranch: 'chore/docs-refresh'
    });

    expect(result.matchPattern).toBe('main');
    expect(result.version).toBe('1.8.173');
    expect(fileSystem.readJson<{ version: string }>('version.production.json').version).toBe('1.8.173');
  });

  it('applies custom tag format in branch-aware release metadata', async () => {
    setupMockFilesystem({
      'package.json': { version: '1.8.172' }
    });

    const manager = new VersionManager(createConfig({
      enabled: true,
      defaultBranch: 'main',
      branches: {
        main: {
          versionFormat: 'semantic',
          tagFormat: 'release-{version}',
          syncFiles: ['package.json'],
          bumpStrategy: 'semantic'
        }
      }
    }));

    const result = await manager.bumpVersionBranchAware('patch', { targetBranch: 'main' });
    expect(result.tagFormat).toBe('release-{version}');
  });
});
