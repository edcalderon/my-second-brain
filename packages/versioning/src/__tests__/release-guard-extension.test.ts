import * as fs from 'fs-extra';
import simpleGit from 'simple-git';
import { Command } from 'commander';
import extension from '../extensions/release-guard/index';

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
  fsMock.readFile.mockImplementation(async (filePath) => {
    const normalizedPath = String(filePath);
    if (!jsonStore.has(normalizedPath)) {
      throw new Error(`ENOENT: ${normalizedPath}`);
    }
    return JSON.stringify(jsonStore.get(normalizedPath));
  });

  return {
    jsonStore
  };
}

describe('release-guard extension', () => {
  const gitClient = {
    tags: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    simpleGitMock.mockReturnValue(gitClient);
    gitClient.tags.mockResolvedValue({ all: [] });
  });

  it('runs the preRelease hook with extensionConfig compatibility', async () => {
    setupMockFilesystem({
      'package.json': { version: '1.2.3' }
    });

    await expect(extension.hooks?.preRelease?.('1.2.3', {
      config: {
        rootPackageJson: 'package.json',
        releaseGuard: { enabled: false },
        extensionConfig: {
          'release-guard': {
            enabled: true,
            tagPrefix: 'versioning-v'
          }
        }
      }
    })).resolves.toBeUndefined();
  });

  it('registers and executes the guard-tag command', async () => {
    setupMockFilesystem({
      'package.json': { version: '1.2.3' }
    });

    const program = new Command();
    await extension.register(program, {
      rootPackageJson: 'package.json',
      extensionConfig: {
        'release-guard': {
          enabled: true,
          tagPrefix: 'versioning-v'
        }
      }
    });

    const guardCommand = program.commands.find((command) => command.name() === 'guard-tag');
    expect(guardCommand).toBeDefined();
    expect(guardCommand?.options.map((option) => option.flags)).toEqual(expect.arrayContaining([
      '-t, --tag <tag>',
      '--package-json <path>'
    ]));

    await expect(program.parseAsync(['node', 'test', 'guard-tag', '--tag', 'versioning-v1.2.3'])).resolves.toBe(program);
  });
});