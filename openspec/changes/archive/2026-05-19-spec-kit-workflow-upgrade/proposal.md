## Why

Current spec-driven work in this repo is only partially standardized. We have
OpenSpec scaffolding and repo guidance, but no durable constitution, no
reusable change template, and no explicit workflow guide that keeps non-trivial
changes on the spec-first path. A Spec Kit-style baseline will reduce drift and
make future change authoring more repeatable.

## What Changes

- Add a repo-level constitution that defines non-negotiable rules for
  spec-driven work.
- Add a reusable change-folder template that shows the expected artifact
  layout and review order.
- Add a workflow guide that explains when to create a change, how to write the
  artifacts, and when implementation may begin.
- Update agent instructions so contributors treat the constitution and
  template as canonical.
- Keep public-facing specs and docs free of private backend implementation
  details.

## Capabilities

### New Capabilities

- `spec-driven-workflow`: standardized change lifecycle for spec-first work,
  from proposal to archive.

### Modified Capabilities

- None.

## Impact

- `edward/.codex/AGENTS.md`
- `edward/openspec/`
- `edward/docs/`
- future non-trivial change authoring and implementation flow
