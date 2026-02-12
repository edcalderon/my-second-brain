import { StatusRenderer } from '../extensions/reentry-status/status-renderer';
import { RoadmapRenderer } from '../extensions/reentry-status/roadmap-renderer';

describe('StatusRenderer backward compatibility (v1.0 → v1.1 defaults)', () => {
  test('loads v1.0 JSON missing milestone and roadmapFile', () => {
    const v10 = {
      schemaVersion: '1.0',
      version: '0.1.0',
      lastUpdated: '2020-01-01T00:00:00.000Z',
      updatedBy: 'me',
      context: {
        trigger: 'manual',
        gitInfo: { branch: 'main', commit: 'abc', author: 'me', timestamp: '2020-01-01T00:00:00.000Z' },
        versioningInfo: {}
      },
      currentPhase: 'planning',
      milestones: [],
      blockers: [],
      nextSteps: [],
      risks: [],
      dependencies: [],
      versioning: { currentVersion: '0.1.0', previousVersion: '0.0.9', versionType: 'patch' },
      syncMetadata: { lastSyncAttempt: '2020-01-01T00:00:00.000Z', lastSuccessfulSync: '2020-01-01T00:00:00.000Z' }
    };

    const loaded = StatusRenderer.parseJson(JSON.stringify(v10));
    expect(loaded.schemaVersion).toBe('1.0');
    expect(loaded.milestone).toBeNull();
    expect(loaded.roadmapFile).toBe(RoadmapRenderer.defaultRoadmapPath());

    const md = StatusRenderer.renderMarkdown(loaded);
    expect(md).toContain('Milestone: —');
    expect(md).toContain(`Roadmap: ${RoadmapRenderer.defaultRoadmapPath()}`);
  });
});
