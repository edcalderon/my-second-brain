# Edward Constitution

Version: 1.0

Scope: all non-trivial changes in this repository.

## Principles

1. Change first.
   - Non-trivial work MUST begin in an OpenSpec change directory.
   - Proposal, spec, and tasks MUST exist before implementation starts.

2. Clarify before guessing.
   - Ambiguous requirements MUST be recorded explicitly.
   - If a behavior, environment, or boundary is unclear, do not infer it
     silently.

3. Behavior before implementation.
   - Specs MUST describe observable behavior and acceptance criteria.
   - Design docs MAY explain implementation decisions, but they MUST not replace
     the spec.

4. Keep complexity minimal.
   - Prefer the smallest design that satisfies the requirement.
   - Add optional artifacts only when the change actually needs them.

5. Protect the public boundary.
   - Public-facing docs and specs MUST stay free of private backend details and
     secrets.
   - Environment-specific behavior MAY be documented, but implementation
     internals MUST stay out of public artifacts.

6. Make the template reusable.
   - New non-trivial changes SHOULD follow the standard change-folder layout.
   - The template SHOULD make the expected artifact order obvious.

7. Archive completed work.
   - Finished changes MUST be archived after the final spec is synced.
   - The main spec tree MUST remain the source of truth for active capability
     behavior.

8. Keep the workflow visible.
   - Update process docs when the workflow changes.
   - If a rule becomes outdated, revise the constitution rather than relying on
     memory.
