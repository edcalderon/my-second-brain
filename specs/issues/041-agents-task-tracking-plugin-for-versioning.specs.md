# Technical Specification for Issue #41

## Issue Summary
- Title: feat: agents task-tracking plugin for @edcalderon/versioning — active/pending/done folder schema + reentry guard
- Description: Add a built-in tasks extension for the `.agents/` folder convention, including README index generation, archive/sync commands, and a validation guard tied to reentry status.
- Labels: none
- Priority: High

## Problem Statement
The repository already uses reentry status files as a generated project summary, but task tracking is still maintained manually in `.agents/` folders. That leaves a gap between task files, feature specs, and the generated reentry artifacts, which makes it easy for those views to drift apart.

This should become a first-class versioning feature. The package needs a tasks plugin that can inspect `.agents/active-tasks`, `.agents/pending-tasks`, and `.agents/done-tasks`, regenerate feature README indexes, archive task files cleanly, and validate that the task inventory is still synchronized with the reentry state.

## Technical Approach
Add a new built-in `tasks` extension that scans the `.agents/` tree and treats each feature folder as a task group. The extension should:
- list task files by category and feature
- create new task files from a template
- archive active or pending tasks into done
- regenerate per-feature README index files
- validate the current `.agents/` inventory against a persisted task snapshot in reentry status

To support the guard behavior, extend the reentry status model with optional task sync metadata. `tasks sync` should update the snapshot hash and summary counts in reentry status, which in turn updates `REENTRY.md`. `tasks validate` should compare the current `.agents/` state to that stored snapshot and fail when drift is detected.

Add a companion `reentry validate` command that compares the generated JSON and markdown files against the rendered status object. The intended pre-push sequence becomes:

```bash
versioning tasks validate && versioning reentry validate
```

The feature should treat `00-SPEC.md` as a special file representing the feature spec, not as a normal task entry.

## Implementation Plan
1. Add task inventory scanning, task-file parsing, and README rendering helpers.
2. Add the `tasks` command tree with `list`, `add`, `archive`, `sync`, and `validate`.
3. Extend reentry status with optional task snapshot metadata and add `reentry validate`.
4. Wire `tasks sync` to update reentry status so task drift becomes visible in generated files.

## Test Plan
1. Unit Tests:
   - task scanning groups files by category and feature
   - `00-SPEC.md` is treated as a feature spec
   - README index rendering is deterministic
   - snapshot hashing changes when task files change
2. Command Tests:
   - `tasks list` registers and prints the expected inventory
   - `tasks archive` moves files and updates generated README output
   - `tasks sync` updates the reentry task snapshot
   - `tasks validate` fails on drift
   - `reentry validate` fails when the generated files are stale

## Files to Modify
- `packages/versioning/src/extensions/reentry-status/models.ts`: add optional task snapshot metadata
- `packages/versioning/src/extensions/reentry-status/status-renderer.ts`: render and parse the new metadata
- `packages/versioning/src/extensions/reentry-status/file-manager.ts`: preserve generated task metadata in file writes
- `packages/versioning/src/extensions/reentry-status/extension.ts`: add `reentry validate`
- `packages/versioning/src/extensions.ts`: no direct change unless new extension registration needs it
- `packages/versioning/README.md`: document the new tasks plugin
- `packages/versioning/USAGE.md`: document task and reentry validation flow
- `packages/versioning/CHANGELOG.md`: add the 1.5.11 entry

## Files to Create
- `packages/versioning/src/extensions/tasks/index.ts`: tasks CLI extension
- `packages/versioning/src/extensions/tasks/scanner.ts`: inventory scanning and snapshot hashing
- `packages/versioning/src/extensions/tasks/renderer.ts`: README index generation
- `packages/versioning/src/extensions/tasks/template.ts`: task file and spec templates
- `packages/versioning/src/__tests__/tasks-extension.test.ts`: command coverage
- `packages/versioning/src/__tests__/tasks-scanner.test.ts`: inventory and hashing coverage
- `packages/versioning/src/__tests__/reentry-validate.test.ts`: reentry validation coverage

## Existing Utilities to Leverage
- `packages/versioning/src/extensions/reentry-status/file-manager.ts`: atomic file writes
- `packages/versioning/src/extensions/reentry-status/status-renderer.ts`: deterministic status rendering
- `packages/versioning/src/extensions/reentry-status/config-manager.ts`: path resolution and project scoping
- `packages/versioning/src/extensions/readme-maintainer/index.ts`: CLI extension pattern reference

## Success Criteria
- [ ] `versioning tasks list` reads `.agents/` and reports task groups
- [ ] `versioning tasks archive <path>` moves a task into `done-tasks` and refreshes indexes
- [ ] `versioning tasks sync` regenerates the README indexes and task snapshot metadata
- [ ] `versioning tasks validate` exits non-zero when the `.agents/` tree and reentry snapshot diverge
- [ ] `versioning reentry validate` fails when generated status files are stale
- [ ] `00-SPEC.md` is treated as a feature spec, not a normal task item

## Out of Scope
- Replacing the existing reentry system
- Building a full issue tracker UI
