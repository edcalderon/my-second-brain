import { ConfigManager } from '../extensions/reentry-status/config-manager';

describe('reentry-status multi-project support', () => {
  test('defaults are project-scoped when project is provided', () => {
    const cfg = ConfigManager.loadConfig({}, 'trading');
    expect(cfg.files.jsonPath).toBe('.versioning/projects/trading/reentry.status.json');
    expect(cfg.files.markdownPath).toBe('.versioning/projects/trading/REENTRY.md');
  });

  test('canonicalizes scoped package names to a stable project key', () => {
    const cfg = ConfigManager.loadConfig({}, '@ed/trader');
    expect(cfg.files.jsonPath).toBe('.versioning/projects/trader/reentry.status.json');
    expect(cfg.files.markdownPath).toBe('.versioning/projects/trader/REENTRY.md');
  });

  test('canonicalizes path-like inputs to a stable project key', () => {
    const cfg = ConfigManager.loadConfig({}, 'apps/trader');
    expect(cfg.files.jsonPath).toBe('.versioning/projects/trader/reentry.status.json');
    expect(cfg.files.markdownPath).toBe('.versioning/projects/trader/REENTRY.md');
  });

  test('project overrides from config are respected', () => {
    const rootConfig = {
      reentryStatus: {
        enabled: true,
        projects: {
          trading: {
            files: {
              jsonPath: '.versioning/custom/trading.status.json',
              markdownPath: '.versioning/custom/trading.REENTRY.md',
            },
          },
        },
      },
    };

    const cfg = ConfigManager.loadConfig(rootConfig, 'trading');
    expect(cfg.files.jsonPath).toBe('.versioning/custom/trading.status.json');
    expect(cfg.files.markdownPath).toBe('.versioning/custom/trading.REENTRY.md');
  });
});
