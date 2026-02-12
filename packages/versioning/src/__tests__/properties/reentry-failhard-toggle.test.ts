import fc from 'fast-check';
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
    nextSteps: [],
    risks: [],
    dependencies: [],
    versioning: { currentVersion: '0.0.0', previousVersion: '0.0.0', versionType: 'patch' },
    syncMetadata: { lastSyncAttempt: '1970-01-01T00:00:00.000Z', lastSuccessfulSync: '1970-01-01T00:00:00.000Z' }
  };
}

describe('Property 3: Fail-Hard Behavior Toggle', () => {
  test('for any failure, failHard=true throws; failHard=false returns error result', () => {
    fc.assert(
      fc.asyncProperty(fc.boolean(), async (failHard) => {
        const mem = new MemoryFs();
        const fm = new FileManager(mem);
        // Seed status so manager doesn't need disk.
        await fm.writeStatusFiles({
          reentryStatus: { files: { jsonPath: '.versioning/reentry.status.json', markdownPath: '.versioning/REENTRY.md' } }
        }, makeStatus());

        const mgr = new ReentryStatusManager({
          fileManager: fm,
          createGitHubSyncer: () => ({
            renderIssueBody: () => 'x',
            sync: async () => { throw new Error('github boom'); }
          })
        });

        const cfg = {
          reentryStatus: {
            enabled: true,
            autoSync: true,
            failHard,
            files: { jsonPath: '.versioning/reentry.status.json', markdownPath: '.versioning/REENTRY.md' },
            github: {
              enabled: true,
              owner: 'o',
              repo: 'r',
              issue: { title: 't', labels: [] },
              auth: { token: 'token' }
            }
          }
        };

        if (failHard) {
          await expect(mgr.syncAll(cfg, ['github'])).rejects.toThrow('github boom');
          return;
        }

        const results = await mgr.syncAll(cfg, ['github']);
        const gh = results.find((r) => r.target === 'github');
        expect(gh?.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
