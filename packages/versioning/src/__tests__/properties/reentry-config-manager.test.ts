import fc from 'fast-check';
import { ConfigManager } from '../../extensions/reentry-status/config-manager';
import { ReentryStatusConfig } from '../../extensions/reentry-status/models';

function deepStripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepStripUndefined);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      output[k] = deepStripUndefined(v);
    }
    return output;
  }
  return value;
}

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 });

const partialReentryStatusConfigArb: fc.Arbitrary<any> = fc.record({
  enabled: fc.option(fc.boolean(), { nil: undefined }),
  autoSync: fc.option(fc.boolean(), { nil: undefined }),
  failHard: fc.option(fc.boolean(), { nil: undefined }),
  files: fc.option(
    fc.record({
      jsonPath: fc.option(nonEmptyStringArb, { nil: undefined }),
      markdownPath: fc.option(nonEmptyStringArb, { nil: undefined })
    }),
    { nil: undefined }
  ),
  github: fc.option(
    fc.record({
      enabled: fc.boolean(),
      owner: fc.option(nonEmptyStringArb, { nil: undefined }),
      repo: fc.option(nonEmptyStringArb, { nil: undefined }),
      issue: fc.option(
        fc.record({
          title: fc.option(nonEmptyStringArb, { nil: undefined }),
          labels: fc.option(fc.array(nonEmptyStringArb, { maxLength: 5 }), { nil: undefined }),
          assignees: fc.option(fc.array(nonEmptyStringArb, { maxLength: 5 }), { nil: undefined }),
          template: fc.option(nonEmptyStringArb, { nil: undefined })
        }),
        { nil: undefined }
      ),
      auth: fc.option(
        fc.record({
          token: fc.option(nonEmptyStringArb, { nil: undefined })
        }),
        { nil: undefined }
      )
    }) as any,
    { nil: undefined }
  ),
  obsidian: fc.option(
    fc.record({
      enabled: fc.boolean(),
      vaultPath: fc.option(nonEmptyStringArb, { nil: undefined }),
      notePath: fc.option(nonEmptyStringArb, { nil: undefined }),
      template: fc.option(nonEmptyStringArb, { nil: undefined }),
      frontmatter: fc.option(fc.dictionary(nonEmptyStringArb, fc.jsonValue()), { nil: undefined })
    }) as any,
    { nil: undefined }
  ),
  template: fc.option(
    fc.record({
      includeSections: fc.option(fc.array(nonEmptyStringArb, { maxLength: 10 }), { nil: undefined }),
      excludeSections: fc.option(fc.array(nonEmptyStringArb, { maxLength: 10 }), { nil: undefined })
    }) as any,
    { nil: undefined }
  )
});

describe('Property 1: Configuration Loading and Defaults', () => {
  test('loadConfig yields safe defaults even when reentryStatus is missing or partial', () => {
    fc.assert(
      fc.property(fc.option(partialReentryStatusConfigArb, { nil: undefined }), (partial) => {
        const rootConfig = partial === undefined ? {} : { reentryStatus: deepStripUndefined(partial) };
        const loaded = ConfigManager.loadConfig(rootConfig);

        expect(typeof loaded.enabled).toBe('boolean');
        expect(typeof loaded.autoSync).toBe('boolean');
        expect(typeof loaded.failHard).toBe('boolean');

        expect(typeof loaded.files.jsonPath).toBe('string');
        expect(loaded.files.jsonPath.length).toBeGreaterThan(0);

        expect(typeof loaded.files.markdownPath).toBe('string');
        expect(loaded.files.markdownPath.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Configuration Validation', () => {
  test('github.enabled=true requires owner/repo/title/labels/token', () => {
    fc.assert(
      fc.property(partialReentryStatusConfigArb, (partial) => {
        const base = ConfigManager.mergeWithDefaults(deepStripUndefined(partial) as any);

        const invalid = {
          ...base,
          github: {
            enabled: true,
            owner: '',
            repo: '',
            issue: { title: '', labels: [] },
            auth: { token: '' }
          }
        } as ReentryStatusConfig;

        const result = ConfigManager.validateConfig(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  test('obsidian.enabled=true requires vaultPath and notePath', () => {
    fc.assert(
      fc.property(partialReentryStatusConfigArb, (partial) => {
        const base = ConfigManager.mergeWithDefaults(deepStripUndefined(partial) as any);

        const invalid = {
          ...base,
          obsidian: {
            enabled: true,
            vaultPath: '',
            notePath: ''
          }
        } as ReentryStatusConfig;

        const result = ConfigManager.validateConfig(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
