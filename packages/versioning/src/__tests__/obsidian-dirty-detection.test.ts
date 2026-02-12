import { ObsidianSyncAdapter, ObsidianClient } from '../extensions/reentry-status/obsidian-sync-adapter';
import { ReentryStatus } from '../extensions/reentry-status/models';
import { sha256 } from '../extensions/reentry-status/dirty-detection';

function makeStatus(overrides: Partial<ReentryStatus> = {}): ReentryStatus {
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
    syncMetadata: { lastSyncAttempt: '1970-01-01T00:00:00.000Z', lastSuccessfulSync: '1970-01-01T00:00:00.000Z' },
    ...overrides
  };
}

describe('Obsidian dirty detection', () => {
  test('skips upsert when existing note content matches', async () => {
    const calls = { get: 0, upsert: 0 };
    const client: ObsidianClient = {
      getNote: async () => {
        calls.get += 1;
        return { path: 'n', content: 'BODY\n' };
      },
      upsertNote: async () => {
        calls.upsert += 1;
        return { path: 'n', content: 'x' };
      }
    };

    const adapter = new ObsidianSyncAdapter(
      { enabled: true, vaultPath: '/vault', notePath: 'Note.md' },
      client
    );

    const result = await adapter.sync(makeStatus(), 'BODY\n');
    expect(result.success).toBe(true);
    expect(result.details).toMatchObject({ skipped: true });
    expect(calls.get).toBe(1);
    expect(calls.upsert).toBe(0);
  });

  test('skips all calls when last published hash matches', async () => {
    const client: ObsidianClient = {
      getNote: async () => {
        throw new Error('should not call');
      },
      upsertNote: async () => {
        throw new Error('should not call');
      }
    };

    const adapter = new ObsidianSyncAdapter(
      { enabled: true, vaultPath: '/vault', notePath: 'Note.md' },
      client
    );

    const hash = sha256('BODY\n');
    const status = makeStatus({
      syncMetadata: {
        lastSyncAttempt: '1970-01-01T00:00:00.000Z',
        lastSuccessfulSync: '1970-01-01T00:00:00.000Z',
        published: { obsidianNoteBodySha256: hash }
      }
    });

    const result = await adapter.sync(status, 'BODY\n');
    expect(result.success).toBe(true);
    expect(result.details).toMatchObject({ skipped: true, reason: 'unchanged (hash)' });
  });
});
