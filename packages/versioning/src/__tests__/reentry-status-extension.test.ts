import extension from '../extensions/reentry-status/index';
import {
  REENTRY_EXTENSION_NAME,
  ROADMAP_MD_FILENAME,
  REENTRY_STATUS_DIRNAME,
  REENTRY_STATUS_JSON_FILENAME,
  REENTRY_STATUS_MD_FILENAME
} from '../extensions/reentry-status/constants';

describe('reentry-status-extension scaffolding', () => {
  test('exports a VersioningExtension-compatible shape', () => {
    expect(extension).toBeDefined();
    expect(extension.name).toBe('reentry-status');
    expect(typeof extension.description).toBe('string');
    expect(typeof extension.version).toBe('string');
    expect(typeof extension.register).toBe('function');
  });

  test('defines canonical file locations', () => {
    expect(REENTRY_STATUS_DIRNAME).toBe('.versioning');
    expect(REENTRY_STATUS_JSON_FILENAME).toBe('reentry.status.json');
    expect(REENTRY_STATUS_MD_FILENAME).toBe('REENTRY.md');
    expect(ROADMAP_MD_FILENAME).toBe('ROADMAP.md');
  });
});
