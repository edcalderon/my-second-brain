# Spec-Driven Workflow

This repository uses OpenSpec as the default change workflow. The goal is to
keep non-trivial work spec-first, behavior-driven, and easy to review.

## Checklist

1. Read the repo constitution in `openspec/memory/constitution.md`.
2. Create or update an OpenSpec change for any non-trivial work:
   - `openspec new change <change-name>`
3. Write `proposal.md` first.
4. Write the spec next, focused on observable behavior.
5. Add `design.md` only when the change needs technical decisions before code.
6. Generate `tasks.md` after the proposal/spec/design pieces are ready.
7. Implement from `tasks.md`.
8. Archive the change after the final spec is synced into the main spec tree.

## Rules of Thumb

- Use `proposal.md` for why the change exists.
- Use `spec.md` for what the system must do.
- Use `design.md` for how the solution is shaped.
- Use `tasks.md` for concrete implementation steps.
- Add `research.md`, `contracts/`, `data-model.md`, and `quickstart.md` only
  when they materially help the change.
- Do not guess at unclear requirements. Record the uncertainty explicitly and
  resolve it before implementation.

## Public Boundary

This repository is public. Keep specs and workflow docs focused on behavior and
environment selection. Do not add private backend implementation details or
secrets here.
