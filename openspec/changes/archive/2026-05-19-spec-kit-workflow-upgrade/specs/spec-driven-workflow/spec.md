## ADDED Requirements

### Requirement: Repository constitution
The repository SHALL maintain a versioned constitution that defines the
non-negotiable rules for spec-driven work.

#### Scenario: Starting non-trivial work
- **WHEN** a contributor begins a non-trivial change
- **THEN** they SHALL consult the constitution before editing implementation
  files

### Requirement: Change-first workflow
The repository SHALL require non-trivial changes to start in a dedicated change
directory with a proposal, a spec, and tasks before implementation.

#### Scenario: New feature request
- **WHEN** a feature or workflow change is requested
- **THEN** the work SHALL be captured in a change directory before code is
  edited

### Requirement: Clarification gate
The repository SHALL surface unresolved ambiguity explicitly instead of
guessing.

#### Scenario: Missing requirement detail
- **WHEN** a request does not specify a critical behavior, environment, or
  boundary
- **THEN** the change artifacts SHALL record the uncertainty as
  `[NEEDS CLARIFICATION]` or an equivalent open question

### Requirement: Behavior-first specification
The repository SHALL express requirements as observable behavior and acceptance
criteria rather than implementation steps.

#### Scenario: Drafting a spec
- **WHEN** a spec is written
- **THEN** it SHALL use testable SHALL statements and scenarios that describe
  observable outcomes

### Requirement: Change template availability
The repository SHALL provide a reusable change-folder template that shows the
expected artifact layout and review order.

#### Scenario: Creating a new change
- **WHEN** a contributor starts a new non-trivial change
- **THEN** the template SHALL show the required files and the order they should
  be produced

### Requirement: Public boundary protection
The public repository SHALL not encode private backend implementation details
or secrets in workflow artifacts or docs.

#### Scenario: Public documentation
- **WHEN** a public-facing spec or guide is updated
- **THEN** it SHALL describe behavior and environment selection without naming
  private backend secrets or internal strategies

### Requirement: Completion archive
The repository SHALL archive completed changes after required artifacts are
done and the spec has been synced into the main spec tree.

#### Scenario: Change finished
- **WHEN** implementation tasks are complete and the spec is approved
- **THEN** the change SHALL be moved to the archive area and the main spec tree
  SHALL reflect the final requirements
