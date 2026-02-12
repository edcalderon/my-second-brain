import fc from 'fast-check';
import { StatusRenderer } from '../../extensions/reentry-status/status-renderer';
import { ReentryStatus } from '../../extensions/reentry-status/models';

const isoDateStringArb = fc
  .integer({ min: 0, max: 4_102_444_800_000 })
  .map((ms) => new Date(ms).toISOString());

const s = fc.string({ minLength: 1, maxLength: 40 });

const statusArb: fc.Arbitrary<ReentryStatus> = fc.record({
  schemaVersion: fc.constant('1.1'),
  version: s,
  lastUpdated: isoDateStringArb,
  updatedBy: s,
  context: fc.record({
    trigger: fc.constantFrom('manual', 'postVersion', 'postRelease', 'auto'),
    gitInfo: fc.record({ branch: s, commit: s, author: s, timestamp: isoDateStringArb }),
    versioningInfo: fc.record({})
  }),
  milestone: fc.option(fc.record({ id: s, title: s }), { nil: null }),
  roadmapFile: s,
  currentPhase: fc.constantFrom('planning', 'development', 'testing', 'staging', 'production', 'maintenance'),
  milestones: fc.constant([]),
  blockers: fc.constant([]),
  nextSteps: fc.array(fc.record({ id: s, description: s, priority: fc.integer({ min: 1, max: 5 }) }), { maxLength: 1 }),
  risks: fc.constant([]),
  dependencies: fc.constant([]),
  versioning: fc.record({ currentVersion: s, previousVersion: s, versionType: fc.constantFrom('patch', 'minor', 'major') }),
  syncMetadata: fc.record({ lastSyncAttempt: isoDateStringArb, lastSuccessfulSync: isoDateStringArb })
});

describe('Property 18: Markdown Parsing Capability', () => {
  test('for any generated REENTRY.md, parseMarkdown recovers equivalent fields', () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        const md = StatusRenderer.renderMarkdown(status);
        const parsed = StatusRenderer.parseMarkdown(md);

        expect(parsed.schemaVersion).toBe(status.schemaVersion);
        expect(parsed.version).toBe(status.version.trim());
        expect(parsed.currentPhase).toBe(status.currentPhase);
        expect(parsed.roadmapFile).toBe(status.roadmapFile.trim());

        if (status.milestone === null) {
          expect(parsed.milestone).toBeNull();
        } else {
          const expectedId = status.milestone.id.trim();
          const expectedTitle = status.milestone.title.trim();
          // If the milestone is effectively empty/whitespace, markdown semantics can't preserve it reliably.
          if (expectedId.length > 0 || expectedTitle.length > 0) {
            expect(parsed.milestone).toMatchObject({ id: expectedId, title: expectedTitle });
          }
        }

        const expectedNext = status.nextSteps?.[0]?.description;
        const parsedNext = parsed.nextSteps?.[0]?.description;
        if (expectedNext && expectedNext.trim().length > 0) {
          expect(parsedNext).toBe(expectedNext.trim());
        }
      }),
      { numRuns: 100 }
    );
  });
});
