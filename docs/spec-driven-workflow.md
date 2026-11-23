# Spec-Driven Workflow

This repository uses OpenSpec for behavior contracts and `.agents/` for the
live task queue. The goal is to keep non-trivial work spec-first,
behavior-driven, and easy to execute without duplicating the same specification.

## Checklist

1. Read the repo constitution in `openspec/memory/constitution.md`.
2. Create or update an OpenSpec change for any non-trivial work:
   - `openspec new change <change-name>`
3. Write `proposal.md` first.
4. Write the spec next, focused on observable behavior.
5. Add `design.md` only when the change needs technical decisions before code.
6. Generate `tasks.md` after the proposal/spec/design pieces are ready.
7. Create linked cards in `.agents/pending-tasks/<feature>/` when the work is
   ready to be queued.
8. Move an individual task to `active-tasks` only after its OpenSpec change is
   ready; implement from the linked OpenSpec task.
9. Archive completed task cards into `done-tasks`, then archive the OpenSpec
   change after the final spec is synced into the main spec tree.

## Rules of Thumb

- Use `proposal.md` for why the change exists.
- Use `spec.md` for what the system must do.
- Use `design.md` for how the solution is shaped.
- Use `tasks.md` for concrete implementation steps.
- Add `research.md`, `contracts/`, `data-model.md`, and `quickstart.md` only
  when they materially help the change.
- Do not guess at unclear requirements. Record the uncertainty explicitly and
  resolve it before implementation.

## Operational Task Workspace

`@edcalderon/versioning` manages the repository's task state in:

```text
.agents/
  pending-tasks/<feature>/
  active-tasks/<feature>/
  done-tasks/<feature>/
```

Each feature folder contains a short `00-SPEC.md` execution brief and numbered
task cards. `00-SPEC.md` must link to the related OpenSpec change when one
exists; it must not reproduce the full behavioral specification. `README.md`
files in task folders are generated indexes.

Run the lifecycle commands from the repository root:

```bash
pnpm tasks:list
pnpm tasks:sync
pnpm workflow:validate
```

Use `pnpm exec versioning tasks archive <task-path>` to complete a card. The
validation command checks both the generated task snapshot and re-entry status.

## Public Boundary

This repository is public. Keep specs and workflow docs focused on behavior and
environment selection. Do not add private backend implementation details or
secrets here.
