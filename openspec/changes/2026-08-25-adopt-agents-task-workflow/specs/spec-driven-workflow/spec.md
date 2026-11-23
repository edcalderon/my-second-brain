## ADDED Requirements

### Requirement: Operational task workspace

The repository SHALL track live task status in the versioning task workspace
under `.agents/pending-tasks`, `.agents/active-tasks`, and
`.agents/done-tasks`.

#### Scenario: A non-trivial task is ready to start

- **WHEN** a non-trivial implementation task is approved for execution
- **THEN** it SHALL have a matching OpenSpec change before it is moved to
  `active-tasks`
- **AND** its task card SHALL link to the matching OpenSpec change

#### Scenario: A task is completed

- **WHEN** a pending or active task is completed
- **THEN** it SHALL be archived through the versioning task workflow
- **AND** the generated task indexes and re-entry snapshot SHALL be refreshed

### Requirement: Single responsibility for specifications

The repository SHALL keep behavioral requirements in OpenSpec and operational
task state in `.agents`, without maintaining mirrored full specifications.

#### Scenario: Creating an execution brief

- **WHEN** a feature receives `00-SPEC.md` in the task workspace
- **THEN** the file SHALL contain a compact goal, tasks, and acceptance criteria
- **AND** it SHALL link to the associated OpenSpec change when one exists
