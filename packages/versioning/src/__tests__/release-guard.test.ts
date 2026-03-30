import * as fs from 'fs-extra';
import simpleGit from 'simple-git';
import {
  deriveTagPrefixFromFormat,
  runReleaseGuard,
  stripTag,
  validateTagVersionMatch
} from '../release-guard';

type JsonStore = Map<string, unknown>;

const fsMock = fs as jest.Mocked<typeof fs>;
const simpleGitMock = simpleGit as unknown as jest.Mock;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setupMockFilesystem(initialJsonFiles: Record<string, unknown>) {
  const jsonStore: JsonStore = new Map(
    Object.entries(initialJsonFiles).map(([filePath, content]) => [filePath, clone(content)])
  );

  fsMock.pathExists.mockImplementation(async (filePath) => jsonStore.has(String(filePath)));
  fsMock.readJson.mockImplementation(async (filePath) => {
    const normalizedPath = String(filePath);
    if (!jsonStore.has(normalizedPath)) {
      throw new Error(`ENOENT: ${normalizedPath}`);
    }
    return clone(jsonStore.get(normalizedPath));
  });
  fsMock.writeJson.mockResolvedValue(undefined as never);
  fsMock.readFile.mockImplementation(async (filePath) => {
    const normalizedPath = String(filePath);
    if (!jsonStore.has(normalizedPath)) {
      throw new Error(`ENOENT: ${normalizedPath}`);
    }
    return JSON.stringify(jsonStore.get(normalizedPath));
  });

  return {
    jsonStore,
    readJson: <T>(filePath: string): T => clone(jsonStore.get(filePath) as T)
  };
}

describe('release guard', () => {
  const gitClient = {
    tags: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    simpleGitMock.mockReturnValue(gitClient);
    gitClient.tags.mockResolvedValue({ all: [] });
  });

  it('strips the expected tag prefix without losing build metadata', () => {
    expect(stripTag('versioning-v1.2.3+build.4', 'versioning-v')).toBe('1.2.3+build.4');
    expect(deriveTagPrefixFromFormat('release-{version}')).toBe('release-');
  });

  it('accepts an exact semver tag match', async () => {
    setupMockFilesystem({
      'package.json': { version: '1.2.3' }
    });

    const result = await validateTagVersionMatch('v1.2.3', 'package.json', {
      tagPrefix: 'v',
      allowBuildMetadata: true
    });

    expect(result.matched).toBe(true);
    expect(result.normalizedTag).toBe('1.2.3');
  });

  it('accepts build metadata tags when allowed', async () => {
    setupMockFilesystem({
      'package.json': { version: '1.2.3' }
    });

    const result = await validateTagVersionMatch('versioning-v1.2.3+build.4', 'package.json', {
      tagPrefix: 'versioning-v',
      allowBuildMetadata: true
    });

    expect(result.matched).toBe(true);
  });

  it('rejects monorepo package mismatches with the divergent path', async () => {
    setupMockFilesystem({
      'package.json': { version: '1.2.3' },
      'packages/app/package.json': { version: '1.2.4' }
    });

    await expect(runReleaseGuard(
      {
        rootPackageJson: 'package.json',
        packages: ['packages/app'],
        releaseGuard: { enabled: true }
      },
      {
        tag: 'v1.2.3',
        tagPrefix: 'v',
        packages: ['packages/app']
      }
    )).rejects.toThrow(/packages\/app\/package\.json=1\.2\.4/);
  });

  it('rejects stale tags below the current release floor', async () => {
    setupMockFilesystem({
      'package.json': { version: '1.2.3' }
    });
    gitClient.tags.mockResolvedValue({ all: ['versioning-v1.2.4'] });

    await expect(runReleaseGuard(
      {
        rootPackageJson: 'package.json',
        packages: [],
        releaseGuard: { enabled: true, tagPrefix: 'versioning-v', allowBuildMetadata: true, checkReleaseFloor: true }
      },
      {
        tag: 'versioning-v1.2.3',
        tagPrefix: 'versioning-v'
      }
    )).rejects.toThrow(/below the current release floor/);
  });

  it('rejects lower build metadata within the same version line', async () => {
    setupMockFilesystem({
      'package.json': { version: '1.2.3' }
    });
    gitClient.tags.mockResolvedValue({ all: ['versioning-v1.2.3+build.5'] });

    await expect(runReleaseGuard(
      {
        rootPackageJson: 'package.json',
        packages: [],
        releaseGuard: { enabled: true, tagPrefix: 'versioning-v', allowBuildMetadata: true, checkReleaseFloor: true }
      },
      {
        tag: 'versioning-v1.2.3+build.4',
        tagPrefix: 'versioning-v'
      }
    )).rejects.toThrow(/below the current release floor/);
  });
});