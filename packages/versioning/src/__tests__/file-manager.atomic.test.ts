import { FileManager, FileSystem } from '../extensions/reentry-status/file-manager';
import { ReentryStatus } from '../extensions/reentry-status/models';

class MemoryFs implements FileSystem {
  private readonly files = new Map<string, string>();
  private failMoveTo: string | null = null;

  setMoveFailure(destPath: string | null) {
    this.failMoveTo = destPath;
  }

  seed(filePath: string, content: string) {
    this.files.set(filePath, content);
  }

  get(filePath: string): string | null {
    return this.files.has(filePath) ? (this.files.get(filePath) as string) : null;
  }

  async pathExists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }

  async ensureDir(_dirPath: string): Promise<void> {
    // no-op for in-memory
  }

  async readFile(filePath: string, _encoding: 'utf8'): Promise<string> {
    const v = this.get(filePath);
    if (v === null) throw new Error(`ENOENT: ${filePath}`);
    return v;
  }

  async writeFile(filePath: string, content: string, _encoding: 'utf8'): Promise<void> {
    this.files.set(filePath, content);
  }

  async move(src: string, dest: string, _options: { overwrite: boolean }): Promise<void> {
    if (this.failMoveTo && dest === this.failMoveTo) {
      throw new Error(`Simulated move failure to ${dest}`);
    }

    const v = this.get(src);
    if (v === null) throw new Error(`ENOENT: ${src}`);
    this.files.set(dest, v);
    this.files.delete(src);
  }

  async remove(filePath: string): Promise<void> {
    this.files.delete(filePath);
  }
}

function makeStatus(): ReentryStatus {
  return {
    schemaVersion: '1.1',
    version: '0.0.0',
    lastUpdated: '1970-01-01T00:00:00.000Z',
    updatedBy: 'me',
    context: {
      trigger: 'manual',
      gitInfo: { branch: 'main', commit: 'abc', author: 'me', timestamp: '1970-01-01T00:00:00.000Z' },
      versioningInfo: {}
    },
    milestone: null,
    roadmapFile: '.versioning/ROADMAP.md',
    currentPhase: 'planning',
    milestones: [],
    blockers: [],
    nextSteps: [{ id: 's1', description: 'Do the thing', priority: 1 }],
    risks: [],
    dependencies: [],
    versioning: { currentVersion: '0.0.0', previousVersion: '0.0.0', versionType: 'patch' },
    syncMetadata: { lastSyncAttempt: '1970-01-01T00:00:00.000Z', lastSuccessfulSync: '1970-01-01T00:00:00.000Z' }
  };
}

describe('FileManager.writeStatusFiles', () => {
  test('writes both JSON and Markdown when either differs', async () => {
    const mem = new MemoryFs();
    const fm = new FileManager(mem);
    const cfg = {
      reentryStatus: {
        files: {
          jsonPath: '.versioning/reentry.status.json',
          markdownPath: '.versioning/REENTRY.md'
        }
      }
    };

    const result = await fm.writeStatusFiles(cfg, makeStatus());
    expect(result.changed).toBe(true);

    expect(mem.get('.versioning/reentry.status.json')).toContain('"schemaVersion"');
    expect(mem.get('.versioning/REENTRY.md')).toContain('# Re-entry Status');
  });

  test('rolls back JSON if markdown move fails (no partial update)', async () => {
    const mem = new MemoryFs();
    const fm = new FileManager(mem);

    const cfg = {
      reentryStatus: {
        files: {
          jsonPath: '.versioning/reentry.status.json',
          markdownPath: '.versioning/REENTRY.md'
        }
      }
    };

    mem.seed('.versioning/reentry.status.json', 'OLD_JSON\n');
    mem.seed('.versioning/REENTRY.md', 'OLD_MD\n');

    // Fail when moving temp markdown into place.
    mem.setMoveFailure('.versioning/REENTRY.md');

    await expect(fm.writeStatusFiles(cfg, makeStatus())).rejects.toThrow('Simulated move failure');

    // JSON should have been restored.
    expect(mem.get('.versioning/reentry.status.json')).toBe('OLD_JSON\n');
    expect(mem.get('.versioning/REENTRY.md')).toBe('OLD_MD\n');
  });
});
