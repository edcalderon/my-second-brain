import { GitHubSyncAdapter, GitHubClient } from '../extensions/reentry-status/github-sync-adapter';
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

describe('GitHub dirty detection', () => {
  test('skips update when existing issue body matches rendered body', async () => {
    const calls = { find: 0, update: 0, create: 0 };
    const client: GitHubClient = {
      findIssueByTitle: async () => {
        calls.find += 1;
        return { id: 1, url: 'u', title: 't', body: '# Re-entry Status (living)\n\nBODY\n' };
      },
      updateIssue: async () => {
        calls.update += 1;
        return { id: 1, url: 'u', title: 't', body: 'x' };
      },
      createIssue: async () => {
        calls.create += 1;
        return { id: 2, url: 'u2', title: 't', body: 'x' };
      }
    };

    const adapter = new GitHubSyncAdapter(
      {
        enabled: true,
        owner: 'o',
        repo: 'r',
        issue: { title: 't', labels: [] },
        auth: { token: 'token' }
      },
      client
    );

    const result = await adapter.sync(makeStatus(), 'BODY\n');
    expect(result.success).toBe(true);
    expect(result.details).toMatchObject({ skipped: true });
    expect(calls.find).toBe(1);
    expect(calls.update).toBe(0);
    expect(calls.create).toBe(0);
  });

  test('skips all API calls when last published hash matches', async () => {
    const client: GitHubClient = {
      findIssueByTitle: async () => {
        throw new Error('should not call');
      },
      updateIssue: async () => {
        throw new Error('should not call');
      },
      createIssue: async () => {
        throw new Error('should not call');
      }
    };

    const adapter = new GitHubSyncAdapter(
      {
        enabled: true,
        owner: 'o',
        repo: 'r',
        issue: { title: 't', labels: [] },
        auth: { token: 'token' }
      },
      client
    );

    // Precompute hash by calling renderIssueBody.
    const tmpStatus = makeStatus();
    const body = adapter.renderIssueBody(tmpStatus, 'BODY\n');
    const status = makeStatus({
      syncMetadata: {
        ...tmpStatus.syncMetadata,
        published: { githubIssueBodySha256: sha256(body) }
      }
    });

    const result = await adapter.sync(status, 'BODY\n');
    expect(result.success).toBe(true);
    expect(result.details).toMatchObject({ skipped: true, reason: 'unchanged (hash)' });
  });
});
