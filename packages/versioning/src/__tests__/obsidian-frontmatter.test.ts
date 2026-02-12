import { ObsidianSyncAdapter, ObsidianClient } from '../extensions/reentry-status/obsidian-sync-adapter';
import { ReentryStatus } from '../extensions/reentry-status/models';

test('Obsidian note content includes deterministic YAML frontmatter when configured', () => {
  const client: ObsidianClient = {
    getNote: async () => null,
    upsertNote: async (p) => ({ path: p.notePath, content: p.content })
  };

  const adapter = new ObsidianSyncAdapter(
    {
      enabled: true,
      vaultPath: '/vault',
      notePath: 'Note.md',
      frontmatter: { tags: ['reentry', 'roadmap'], owner: 'me', nested: { a: 1 } }
    },
    client
  );

  const status: ReentryStatus = {
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

  const content = adapter.renderNoteContent(status, '# Re-entry Status\n');
  expect(content).toContain('---');
  expect(content).toContain('owner: me');
  expect(content).toContain('tags:');
  expect(content).toContain('- reentry');
  expect(content).toContain('nested:');
});
