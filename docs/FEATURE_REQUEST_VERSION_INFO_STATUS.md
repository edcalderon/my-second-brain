# Feature Request: `versioning info` / `versioning status`

## Summary
Add a new command (`versioning info` with alias `versioning status`) that gives users a single, readable snapshot of:

1. Installation health and CLI/runtime details.
2. Current tool version vs latest available version.
3. Sync status across configured apps/packages.
4. A dependency graph of synced apps (with stale/out-of-sync indicators).

This will help users quickly validate whether their installation is healthy and whether all synced apps are aligned.

---

## Problem
Today, users need to run multiple commands or inspect files manually to answer basic operational questions:

- Is my installation healthy and configured correctly?
- Am I running the latest `@edcalderon/versioning` release?
- Which apps are currently in sync?
- Which synced apps depend on outdated versions of other internal packages?

This is especially painful in monorepos where sync state and dependency relationships are spread across many packages.

---

## Proposed Solution
### New CLI commands
- `versioning info`
- `versioning status` (alias of `info`)

### Command output sections
1. **Installation / Environment**
   - CLI version
   - Node.js version
   - Package manager detected (npm/pnpm/yarn)
   - Config file path and validation result
   - Git repo state (branch, clean/dirty)

2. **Version Freshness**
   - Current installed version
   - Latest published version (npm registry)
   - Update recommendation if behind (`major`/`minor`/`patch`)

3. **Sync Health**
   - List of packages/apps under version synchronization
   - Current versions per package
   - Drift detection summary (in-sync/out-of-sync)

4. **Dependency Graph of Synced Apps**
   - Graph view section (rendered as a table by default; optional text-tree view via a flag)
   - Optional machine-readable formats (`--json` initially, future: `--dot`, `--mermaid`)
   - Highlights:
     - stale internal dependency links
     - missing package references
     - cyclical dependency warning

---

## Example UX

```bash
$ versioning info

Versioning CLI: 1.4.2
Latest available: 1.5.0  (update available: minor)
Node.js: v20.17.0
Package manager: pnpm
Config: ./versioning.config.json (valid)
Git: branch=main, working-tree=clean

Sync status:
  ✓ apps/dashboard        1.4.2
  ✓ packages/trading-core 1.4.2
  ✗ packages/gcp-functions 1.4.1 (out of sync)

Dependency graph (synced apps):
  apps/dashboard
  ├── packages/trading-core@1.4.2 ✓
  └── packages/gcp-functions@1.4.1 ✗ stale (expected 1.4.2)
```

Optional outputs:

```bash
versioning info --json
```

Future enhancements (out of scope for initial release):
```bash
versioning info --dot > sync-graph.dot
```

---

## Scope
### In scope
- Add `info` command and `status` alias.
- Compose information from existing config/sync/versioning utilities.
- Add output format flags (`table` default, `json` initially).
- Add dependency graph generation for synced apps.

### Out of scope (initial release)
- `--dot` and `--mermaid` output formats.
- Automatic fix mode for sync drift.
- Remote dashboard visualization.
- Full historical trend analytics.

---

## Acceptance Criteria
- [ ] `versioning info` and `versioning status` both work and produce equivalent results.
- [ ] Command exits `0` on healthy state and non-zero on critical failure (e.g., invalid config).
- [ ] Output includes installed version and latest published version.
- [ ] Output includes sync summary with clear in-sync/out-of-sync markers.
- [ ] Output includes dependency graph for synced apps.
- [ ] `--json` output is stable and documented.
- [ ] Tests cover:
  - command registration
  - stale version detection
  - graph generation
  - invalid config behavior

---

## Implementation Notes
- Reuse existing sync/version parsing logic where possible.
- Add a small formatter module to keep command logic clean.
- Consider a `--strict` mode:
  - fail command if any out-of-sync package is detected.

Suggested files (tentative):
- `packages/versioning/src/cli.ts` (register command)
- `packages/versioning/src/status.ts` (aggregation logic)
- `packages/versioning/src/__tests__/status-command.test.ts`

---

## Benefits
- Faster diagnostics for installation and runtime health.
- Better confidence before release/version bump operations.
- Clear visibility into dependency drift across synced apps.
- Foundation for future observability/reporting features.

---

## Labels
`feature-request`, `cli`, `status`, `versioning`, `monorepo`, `observability`

## Priority
Medium-High
