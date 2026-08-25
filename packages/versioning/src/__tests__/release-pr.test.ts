import { extractLatestChangelogSection } from '../extensions/release-pr/index';

// This is the piece of release-pr that builds the actual PR body a human
// reviews before a release ships -- extracting the wrong section (or the
// whole file) would either show a reviewer nothing useful or the entire
// changelog history instead of just what changed. The rest of
// release-pr's orchestration (branch creation, secrets-check gate, gh pr
// create) is exercised in practice each real release run rather than
// mocked here -- see docs/hosting-decision.md §15-16 in the a-quant repo
// for the two real runs this was validated against.
describe('extractLatestChangelogSection', () => {
  const changelog = `# Changelog

## [1.5.5](https://example.com/compare/v1.5.4...v1.5.5) (2026-08-25)

### Features

* **dashboard:** live trading desk

## [1.5.4](https://example.com/compare/v1.5.3...v1.5.4) (2026-05-19)

### Bug Fixes

* flatten a-quant and portfolio ui
`;

  it('extracts only the section for the given version', () => {
    const section = extractLatestChangelogSection(changelog, '1.5.5');
    expect(section).toContain('live trading desk');
    expect(section).not.toContain('flatten a-quant');
  });

  it('extracts an older section without bleeding into the next one down', () => {
    const section = extractLatestChangelogSection(changelog, '1.5.4');
    expect(section).toContain('flatten a-quant');
    expect(section).not.toContain('live trading desk');
  });

  it('falls back to a placeholder when the version has no section', () => {
    const section = extractLatestChangelogSection(changelog, '9.9.9');
    expect(section).toContain('changelog section not found');
  });
});
