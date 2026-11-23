## Why

Edward has a complete, tested task tracker in `@edcalderon/versioning`, but the
repository did not document it as the operational work queue. A separate
`.specs/` draft area would duplicate OpenSpec and create unclear ownership.

## What Changes

- Adopt `.agents/pending-tasks`, `.agents/active-tasks`, and
  `.agents/done-tasks` as the live task lifecycle already supported by
  `@edcalderon/versioning` v1.5.13.
- Keep OpenSpec as the source of truth for behavior contracts and proposed
  non-trivial changes.
- Document the boundary, validation commands, and desktop-shell pending work.
- Retire the untracked `.specs/` draft area after its only task is migrated.

## Impact

- `.agents/`, `README.md`, `docs/spec-driven-workflow.md`, and `.codex/AGENTS.md`
- `openspec/memory/constitution.md` and the spec-driven workflow capability
- `packages/versioning` documentation and root task scripts
