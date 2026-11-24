# Agent Workspace

`.agents/` is Edward's operational workspace for agent-facing instructions and
the live task queue. It is intentionally separate from source code and from
OpenSpec's behavioral contracts.

## What belongs here

- `skills/` contains reusable instructions for agents.
- `pending-tasks/` contains approved work that has not started.
- `active-tasks/` contains work currently being executed.
- `done-tasks/` contains completed task records.

Each feature has the same slugged folder under a task category. `00-SPEC.md`
is a compact execution brief; numbered Markdown files are independently
assignable tasks. A task moves between categories without changing its feature
slug or filename. Generated per-feature `README.md` indexes must not be edited
by hand.

## Relationship to OpenSpec

OpenSpec remains the source of truth for behavior:

- `openspec/changes/<change>/` holds a proposed non-trivial change.
- `openspec/specs/<capability>/spec.md` holds its approved, durable contract.
- `.agents/*-tasks/<feature>/` holds execution status and task cards.

Do not duplicate a complete OpenSpec contract in `00-SPEC.md`. Instead, link
the execution brief and each task card to its OpenSpec change and task item.
Create the OpenSpec change before moving a non-trivial implementation task to
`active-tasks`.

## Commands

Run these from the `edward/` repository root:

```bash
pnpm exec versioning tasks list
pnpm exec versioning tasks sync
pnpm exec versioning tasks validate
pnpm exec versioning reentry validate
```

Use `versioning tasks archive <path>` to move a completed pending or active
task into `done-tasks`. Always run `tasks sync` after manually adding or moving
task files, then run the validation pair before pushing.

## Secret handling (mandatory for agents)

Before any commit, follow [docs/SECRET_HANDLING.md](../docs/SECRET_HANDLING.md):
no real values in tracked files (including "public" Firebase/Supabase keys),
never print a secret (use a 4-char prefix or sha256 fingerprint), never bypass
hooks, and rotate first if anything leaks. `scripts/secret-scan.sh --staged`
must pass; CI re-checks every push.
