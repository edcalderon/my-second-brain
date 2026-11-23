## Decision

Use separate sources of truth by concern rather than mirror one specification
in multiple folders.

| Concern | Canonical location |
| --- | --- |
| Observable behavior and approved requirements | `openspec/specs/` |
| Proposed non-trivial work | `openspec/changes/` |
| Live task status and assignable work cards | `.agents/*-tasks/` |

`00-SPEC.md` is a short execution brief that links to OpenSpec. It is not a
second behavioral contract. The existing task plugin's plural folder names are
retained because they are implemented, tested, indexed, and included in the
current published package.

## Migration

The only `.specs/` content is the desktop-shell draft created during this
session. Its intent moves into `.agents/pending-tasks/tauri-desktop-shell/`.
No tracked `specs/issues/` history is moved or removed.

## Validation

`versioning tasks sync` regenerates indexes and the re-entry snapshot.
`versioning tasks validate && versioning reentry validate` detects drift before
sharing work. The versioning package is already at npm `latest` (1.5.13), so
this adoption requires no dependency upgrade.
