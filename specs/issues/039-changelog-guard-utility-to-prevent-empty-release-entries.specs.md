# Technical Specification for Issue #39

## Issue Summary
- Title: feat: add changelog guard utility to prevent empty release entries
- Description: Add a reusable guard that detects empty or undocumented changelog releases, with a CLI command and release-path enforcement.
- Labels: enhancement
- Priority: High

## Problem Statement
The versioning package can generate a new release entry even when the resulting changelog section contains no documented changes. That creates misleading releases and weakens the release process, because a tag and version number can be published without any visible release notes.

This should be treated as a reusable guard, not a one-off script. It needs to be available as a CLI command for local and CI checks, and it needs to be enforced during the release flow so empty changelog entries cannot slip through when a release is created.

## Technical Approach
Add a reusable changelog guard utility that parses the current changelog, resolves the target version entry, and verifies that the entry contains at least one documented change item. Expose the utility through a new built-in extension command, `versioning check-changelog`, and invoke the same guard from the release manager after changelog generation.

The guard should support:
- default latest-version checking
- `--version <semver>` for a specific release entry
- `--allow-empty` for explicit CI overrides

The parser should understand the existing changelog heading styles used in the package, including bracketed release headings and conventional changelog section blocks.

## Implementation Plan
1. Add a shared changelog guard module that parses release entries and validates documented change content.
2. Add a built-in extension that exposes `check-changelog` as a CLI command.
3. Wire the release manager to run the same guard after changelog generation and fail the release if the target entry is empty.

## Test Plan
1. Unit Tests:
   - valid changelog entries pass
   - empty entries fail
   - specific version lookup works
   - `--allow-empty` bypasses the failure path
2. Integration Tests:
   - release manager invokes the guard after changelog generation
   - command registration exposes `check-changelog`

## Files to Modify
- `packages/versioning/src/release.ts`: invoke the guard during release
- `packages/versioning/src/changelog.ts`: expose changelog file path metadata if needed
- `packages/versioning/src/index.ts`: export the guard utility
- `packages/versioning/src/extensions.ts`: no direct change unless needed for wiring
- `packages/versioning/README.md`: document the new command
- `packages/versioning/USAGE.md`: document the guard workflow
- `packages/versioning/CHANGELOG.md`: add the 1.5.11 entry

## Files to Create
- `packages/versioning/src/changelog-guard.ts`: shared validation logic
- `packages/versioning/src/extensions/changelog-guard/index.ts`: CLI extension
- `packages/versioning/src/__tests__/changelog-guard.test.ts`: utility coverage
- `packages/versioning/src/__tests__/changelog-guard-extension.test.ts`: command coverage

## Existing Utilities to Leverage
- `packages/versioning/src/changelog.ts`: current changelog generation behavior
- `packages/versioning/src/release.ts`: release orchestration
- `packages/versioning/src/extensions/readme-maintainer/index.ts`: extension/CLI pattern reference

## Success Criteria
- [ ] `versioning check-changelog` validates the latest entry by default
- [ ] `versioning check-changelog --version X.Y.Z` validates a specific entry
- [ ] `versioning check-changelog --allow-empty` exits successfully
- [ ] Release generation fails when the target changelog entry is empty
- [ ] The guard is reusable from both the CLI and the release pipeline

## Out of Scope
- Changing the changelog format itself
- Replacing conventional-changelog with a different generator
