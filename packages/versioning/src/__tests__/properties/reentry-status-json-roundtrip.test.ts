import fc from 'fast-check';
import {
  Blocker,
  Dependency,
  Milestone,
  NextStep,
  ProjectPhase,
  ReentryMilestoneLink,
  ReentrySchemaVersion,
  ReentryStatus,
  Risk,
  UpdateContext
} from '../../extensions/reentry-status/models';

function deepStripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deepStripUndefined);
  }

  if (typeof value === 'number' && Object.is(value, -0)) {
    return 0;
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child === undefined) continue;
      output[key] = deepStripUndefined(child);
    }
    return output;
  }

  return value;
}

// Generate ISO timestamps from a bounded ms-since-epoch range to avoid invalid Date values.
// 0..4102444800000 ~= 1970-01-01..2100-01-01
const isoDateStringArb = fc
  .integer({ min: 0, max: 4_102_444_800_000 })
  .map((ms) => new Date(ms).toISOString());
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 });

const projectPhaseArb: fc.Arbitrary<ProjectPhase> = fc.constantFrom(
  'planning',
  'development',
  'testing',
  'staging',
  'production',
  'maintenance'
);

const schemaVersionArb: fc.Arbitrary<ReentrySchemaVersion> = fc.constantFrom('1.0', '1.1');

const milestoneLinkArb: fc.Arbitrary<ReentryMilestoneLink> = fc.record({
  id: nonEmptyStringArb,
  title: nonEmptyStringArb
});

const updateContextArb: fc.Arbitrary<UpdateContext> = fc.record({
  trigger: fc.constantFrom('manual', 'postVersion', 'postRelease', 'auto'),
  command: fc.option(nonEmptyStringArb, { nil: undefined }),
  options: fc.option(fc.jsonValue(), { nil: undefined }),
  gitInfo: fc.record({
    branch: nonEmptyStringArb,
    commit: nonEmptyStringArb,
    author: nonEmptyStringArb,
    timestamp: isoDateStringArb
  }),
  versioningInfo: fc.record({
    versionType: fc.option(nonEmptyStringArb, { nil: undefined }),
    oldVersion: fc.option(nonEmptyStringArb, { nil: undefined }),
    newVersion: fc.option(nonEmptyStringArb, { nil: undefined })
  })
});

const milestoneArb: fc.Arbitrary<Milestone> = fc.record({
  id: nonEmptyStringArb,
  title: nonEmptyStringArb,
  description: nonEmptyStringArb,
  status: fc.constantFrom('pending', 'in-progress', 'completed', 'blocked'),
  dueDate: fc.option(isoDateStringArb, { nil: undefined }),
  completedDate: fc.option(isoDateStringArb, { nil: undefined })
});

const blockerArb: fc.Arbitrary<Blocker> = fc.record({
  id: nonEmptyStringArb,
  description: nonEmptyStringArb,
  severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
  assignedTo: fc.option(nonEmptyStringArb, { nil: undefined }),
  created: isoDateStringArb,
  resolved: fc.option(fc.boolean(), { nil: undefined }),
  resolutionDate: fc.option(isoDateStringArb, { nil: undefined })
});

const nextStepArb: fc.Arbitrary<NextStep> = fc.record({
  id: nonEmptyStringArb,
  description: nonEmptyStringArb,
  priority: fc.integer({ min: 1, max: 5 }),
  estimatedEffort: fc.option(nonEmptyStringArb, { nil: undefined }),
  dependencies: fc.option(fc.array(nonEmptyStringArb, { maxLength: 10 }), { nil: undefined })
});

const riskArb: fc.Arbitrary<Risk> = fc.record({
  id: nonEmptyStringArb,
  description: nonEmptyStringArb,
  probability: fc.constantFrom('low', 'medium', 'high'),
  impact: fc.constantFrom('low', 'medium', 'high'),
  mitigation: nonEmptyStringArb
});

const dependencyArb: fc.Arbitrary<Dependency> = fc.record({
  id: nonEmptyStringArb,
  name: nonEmptyStringArb,
  type: fc.constantFrom('internal', 'external', 'service'),
  status: fc.constantFrom('healthy', 'degraded', 'down'),
  version: fc.option(nonEmptyStringArb, { nil: undefined })
});

const reentryStatusArb: fc.Arbitrary<ReentryStatus> = fc.record({
  schemaVersion: schemaVersionArb,
  version: nonEmptyStringArb,
  lastUpdated: isoDateStringArb,
  updatedBy: nonEmptyStringArb,
  context: updateContextArb,

  milestone: fc.option(milestoneLinkArb, { nil: null }),
  roadmapFile: nonEmptyStringArb,

  currentPhase: projectPhaseArb,
  milestones: fc.array(milestoneArb, { maxLength: 20 }),
  blockers: fc.array(blockerArb, { maxLength: 20 }),
  nextSteps: fc.array(nextStepArb, { maxLength: 20 }),
  risks: fc.array(riskArb, { maxLength: 20 }),
  dependencies: fc.array(dependencyArb, { maxLength: 20 }),

  versioning: fc.record({
    currentVersion: nonEmptyStringArb,
    previousVersion: nonEmptyStringArb,
    versionType: fc.constantFrom('patch', 'minor', 'major'),
    releaseDate: fc.option(isoDateStringArb, { nil: undefined })
  }),

  syncMetadata: fc.record({
    githubIssueId: fc.option(fc.nat({ max: 1_000_000 }), { nil: undefined }),
    githubIssueUrl: fc.option(nonEmptyStringArb, { nil: undefined }),
    obsidianNotePath: fc.option(nonEmptyStringArb, { nil: undefined }),
    lastSyncAttempt: isoDateStringArb,
    lastSuccessfulSync: isoDateStringArb,
    published: fc.option(
      fc.record({
        githubIssueBodySha256: fc.option(nonEmptyStringArb, { nil: undefined }),
        obsidianNoteBodySha256: fc.option(nonEmptyStringArb, { nil: undefined })
      }),
      { nil: undefined }
    )
  })
});

describe('Property 7: JSON Serialization Round-Trip', () => {
  test('serializing then parsing preserves structural equality (after stripping undefined)', () => {
    fc.assert(
      fc.property(reentryStatusArb, (status) => {
        const json = JSON.stringify(status);
        const parsed = JSON.parse(json) as unknown;

        expect(deepStripUndefined(parsed)).toEqual(deepStripUndefined(status));
      }),
      { numRuns: 100 }
    );
  });
});
