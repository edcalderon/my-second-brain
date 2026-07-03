import { parseChangelog, validateChangelog } from '../changelog-guard';

describe('changelog guard', () => {
  it('parses release headings and validates the newest documented entry', () => {
    const content = `# Changelog

## [1.5.11](https://github.com/acme/repo/compare/v1.5.10...v1.5.11) (2026-07-03)

### Added
- New tasks plugin

### Fixed
- Empty changelog guard

## [1.5.10] - 2026-07-03

### Fixed
- Old release
`;

    const entries = parseChangelog(content);
    expect(entries).toHaveLength(2);
    expect(entries[0].version).toBe('1.5.11');
    expect(entries[0].sections[0].items).toContain('New tasks plugin');

    const result = validateChangelog(content);
    expect(result.ok).toBe(true);
    expect(result.version).toBe('1.5.11');
  });

  it('deduplicates repeated entries and supports explicit version checks', () => {
    const content = `# Changelog

## [1.5.11] - 2026-07-03

### Added

## [1.5.11] - 2026-07-03

### Added
- Real change
`;

    const entries = parseChangelog(content);
    expect(entries).toHaveLength(1);
    expect(entries[0].sections[0].items).toContain('Real change');

    const result = validateChangelog(content, { version: '1.5.11' });
    expect(result.ok).toBe(true);
    expect(result.version).toBe('1.5.11');
  });

  it('fails empty release entries unless allowEmpty is set', () => {
    const content = `# Changelog

## [1.5.11] - 2026-07-03

### Added
`;

    const blocked = validateChangelog(content);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toContain('no documented changes');

    const allowed = validateChangelog(content, { allowEmpty: true });
    expect(allowed.ok).toBe(true);
  });
});
