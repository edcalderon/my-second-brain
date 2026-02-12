import fc from 'fast-check';
import { FileManager, FileSystem } from '../../extensions/reentry-status/file-manager';
import { ReentryStatus } from '../../extensions/reentry-status/models';

class MemoryFs implements FileSystem {
  private readonly files = new Map<string, string>();

  async pathExists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }
  async ensureDir(_dirPath: string): Promise<void> {}
  async readFile(filePath: string, _encoding: 'utf8'): Promise<string> {
    const v = this.files.get(filePath);
    if (v === undefined) throw new Error('ENOENT');
    return v;
  }
  async writeFile(filePath: string, content: string, _encoding: 'utf8'): Promise<void> {
    this.files.set(filePath, content);
  }
  async move(src: string, dest: string, _options: { overwrite: boolean }): Promise<void> {
    const v = this.files.get(src);
    if (v === undefined) throw new Error('ENOENT');
    this.files.set(dest, v);
    this.files.delete(src);
  }
  async remove(filePath: string): Promise<void> {
    this.files.delete(filePath);
  }

  get(filePath: string): string | null {
    return this.files.get(filePath) ?? null;
  }
}

const isoDateStringArb = fc
  .integer({ min: 0, max: 4_102_444_800_000 })
  .map((ms) => new Date(ms).toISOString());

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 50 });

const statusArb: fc.Arbitrary<ReentryStatus> = fc.record({
  schemaVersion: fc.constant('1.1'),
  version: nonEmptyStringArb,
  lastUpdated: isoDateStringArb,
  updatedBy: nonEmptyStringArb,
  context: fc.record({
    trigger: fc.constantFrom('manual', 'postVersion', 'postRelease', 'auto'),
    gitInfo: fc.record({
      branch: nonEmptyStringArb,
      commit: nonEmptyStringArb,
      author: nonEmptyStringArb,
      timestamp: isoDateStringArb
    }),
    versioningInfo: fc.record({})
  }),

  milestone: fc.option(fc.record({ id: nonEmptyStringArb, title: nonEmptyStringArb }), { nil: null }),
  roadmapFile: nonEmptyStringArb,

  currentPhase: fc.constantFrom('planning', 'development', 'testing', 'staging', 'production', 'maintenance'),
  milestones: fc.constant([]),
  blockers: fc.constant([]),
  nextSteps: fc.constant([]),
  risks: fc.constant([]),
  dependencies: fc.constant([]),

  versioning: fc.record({
    currentVersion: nonEmptyStringArb,
    previousVersion: nonEmptyStringArb,
    versionType: fc.constantFrom('patch', 'minor', 'major')
  }),

  syncMetadata: fc.record({
    lastSyncAttempt: isoDateStringArb,
    lastSuccessfulSync: isoDateStringArb
  })
});

describe('Property 4: Dual File Maintenance', () => {
  test('writeStatusFiles creates/updates both files', () => {
    fc.assert(
      fc.asyncProperty(statusArb, async (status) => {
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

        await fm.writeStatusFiles(cfg, status);

        const json = mem.get('.versioning/reentry.status.json');
        const md = mem.get('.versioning/REENTRY.md');

        expect(json).not.toBeNull();
        expect(md).not.toBeNull();
        expect(json as string).toContain('"schemaVersion"');
        expect(md as string).toContain('Roadmap:');
      }),
      { numRuns: 100 }
    );
  });
});
