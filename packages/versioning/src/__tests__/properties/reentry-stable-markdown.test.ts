import fc from 'fast-check';
import { StatusRenderer } from '../../extensions/reentry-status/status-renderer';
import { ReentryStatus } from '../../extensions/reentry-status/models';

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
  nextSteps: fc.array(fc.record({ id: nonEmptyStringArb, description: nonEmptyStringArb, priority: fc.integer({ min: 1, max: 5 }) }), { maxLength: 3 }),
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

describe('Property 6: Stable Output Generation', () => {
  test('renderMarkdown is deterministic for the same input', () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        const a = StatusRenderer.renderMarkdown(status);
        const b = StatusRenderer.renderMarkdown(status);
        expect(a).toBe(b);
      }),
      { numRuns: 100 }
    );
  });
});
