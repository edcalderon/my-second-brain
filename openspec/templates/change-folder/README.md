# OpenSpec Change Folder Template

Use this as the starting shape for any non-trivial change.

## Standard Layout

```text
openspec/changes/<change-name>/
  .openspec.yaml
  proposal.md
  design.md            # only when the change needs architecture decisions
  tasks.md
  specs/
    <capability>/
      spec.md
  research.md          # optional
  contracts/           # optional
  data-model.md        # optional
  quickstart.md        # optional
```

## Artifact Order

1. Write `proposal.md` first.
2. Write `specs/<capability>/spec.md` next.
3. Write `design.md` if the change crosses modules, touches security or
   migration concerns, or needs technical decisions before coding.
4. Write `tasks.md` only after the required proposal, spec, and design pieces
   are ready.
5. Implement from `tasks.md`.
6. Archive the change after the final spec is synced to the main spec tree.

## Rules

- Keep `proposal.md` focused on why the change is needed.
- Keep `spec.md` focused on observable behavior.
- Keep `design.md` focused on technical decisions and trade-offs.
- Keep `tasks.md` concrete, ordered, and scoped to implementation work.
- Add optional artifacts only when the change truly needs them.
- Do not guess at unclear requirements. Mark them explicitly.
