## Context

This repository already uses OpenSpec for capability specs, but the workflow is
still mostly implicit. Contributors need a clearer governance layer so
non-trivial work starts with a change, records ambiguity explicitly, and keeps
behavior contracts separate from implementation detail.

## Goals / Non-Goals

**Goals:**

- Establish a repo-local constitution for spec-driven work.
- Standardize a reusable change-folder shape for future work.
- Make requirements, clarifications, and completion gates explicit.
- Preserve the public/private boundary in the public dashboard repo.

**Non-Goals:**

- Replacing OpenSpec with a different workflow tool.
- Adding new product behavior to the dashboard or docs.
- Encoding line-by-line implementation instructions into specs.

## Decisions

- Store the constitution at `openspec/memory/constitution.md`.
  - Rationale: a single canonical source for process rules is easier to keep
    current than scattered guidance in multiple docs.
  - Alternative considered: keep only repo instructions in `.codex/AGENTS.md`.
    Rejected because that makes the workflow easier to drift over time.

- Provide the reusable change-folder template at
  `openspec/templates/change-folder/README.md`.
  - Rationale: contributors need an example of the expected artifact layout
    without having to inspect prior changes.
  - Alternative considered: generate a shell script scaffold. Rejected for now
    because a documented template is enough and keeps maintenance light.

- Keep the active behavior contract in `openspec/specs/spec-driven-workflow/`.
  - Rationale: workflow rules should be searchable like any other repository
    capability.
  - Alternative considered: keep the process only in docs. Rejected because the
    spec tree is the natural place for durable behavioral contracts.

- Use explicit clarification markers for unknowns instead of guessing.
  - Rationale: this matches the discipline used by Spec Kit and reduces
    incorrect assumptions during planning.

## Risks / Trade-offs

- More upfront documentation is required before code starts.
  - Mitigation: keep the template concise and only require extra artifacts when
    the change actually needs them.

- The process can drift if the constitution and template are not maintained.
  - Mitigation: keep the process docs small, versioned, and referenced from the
    repo agent instructions.

- Public/private boundaries can be blurred if process text is copied between
  repos without adjustment.
  - Mitigation: keep the public repo documentation behavior-only and mirror
    private operational details only where needed in `a-quant`.

## Migration Plan

1. Add the constitution and change-folder template to this repository.
2. Add the workflow guide that explains how to use them.
3. Update agent instructions to point at the new canonical files.
4. Sync the workflow capability spec into the main spec tree.
5. Apply the same pattern to `a-quant` with private-safe wording.

## Open Questions

- Should the template also include an optional `quickstart.md` starter for
  changes that affect local development or deployment?
- Should the repository add a small helper script later to scaffold new change
  folders from the template?
- Should `a-quant` use the same constitution structure or a slightly more
  operational variant?
