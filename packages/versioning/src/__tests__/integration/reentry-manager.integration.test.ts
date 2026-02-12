import { ReentryStatusManager } from '../../extensions/reentry-status/reentry-status-manager';
import { FileManager, FileSystem } from '../../extensions/reentry-status/file-manager';
import { ReentryStatus } from '../../extensions/reentry-status/models';

class MemoryFs implements FileSystem {
  private readonly files = new Map<string, string>();
  async pathExists(p: string): Promise<boolean> { return this.files.has(p); }
  async ensureDir(_d: string): Promise<void> {}
  async readFile(p: string): Promise<string> {
    const v = this.files.get(p);
    if (v === undefined) throw new Error('ENOENT');
    return v;
  }
  async writeFile(p: string, c: string): Promise<void> { this.files.set(p, c); }
  async move(src: string, dest: string): Promise<void> {
    const v = this.files.get(src);
    if (v === undefined) throw new Error('ENOENT');
    this.files.set(dest, v);
    this.files.delete(src);
  }
  async remove(p: string): Promise<void> { this.files.delete(p); }
  get(p: string): string | null { return this.files.get(p) ?? null; }
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
    milestone: { id: 'now-01', title: 'Ship X' },
    roadmapFile: '.versioning/ROADMAP.md',
    currentPhase: 'planning',
    milestones: [],
    blockers: [],
    nextSteps: [{ id: 'next', description: 'Do the thing', priority: 1 }],
    risks: [],
    dependencies: [],
    versioning: { currentVersion: '0.0.0', previousVersion: '0.0.0', versionType: 'patch' },
    syncMetadata: { lastSyncAttempt: '1970-01-01T00:00:00.000Z', lastSuccessfulSync: '1970-01-01T00:00:00.000Z' }
  };
}

describe('integration: ReentryStatusManager syncAll(files)', () => {
  test('creates JSON, REENTRY.md, and ROADMAP.md; second run is idempotent', async () => {
    const mem = new MemoryFs();
    const fm = new FileManager(mem);
    const mgr = new ReentryStatusManager({ fileManager: fm });

    const cfg = {
      reentryStatus: {
        enabled: true,
        autoSync: true,
        failHard: false,
        files: {
          jsonPath: '.versioning/reentry.status.json',
          markdownPath: '.versioning/REENTRY.md'
        }
      }
    };

    await fm.writeStatusFiles(cfg, makeStatus());

    await mgr.syncAll(cfg, ['files']);

    const json1 = mem.get('.versioning/reentry.status.json');
    const md1 = mem.get('.versioning/REENTRY.md');
    const roadmap1 = mem.get('.versioning/ROADMAP.md');

    expect(json1).toContain('"schemaVersion"');
    expect(md1).toContain('Milestone: Ship X (id: now-01)');
    expect(roadmap1).toContain('<!-- roadmap:managed:start -->');

    await mgr.syncAll(cfg, ['files']);

    expect(mem.get('.versioning/reentry.status.json')).toBe(json1);
    expect(mem.get('.versioning/REENTRY.md')).toBe(md1);
    expect(mem.get('.versioning/ROADMAP.md')).toBe(roadmap1);
  });
});
