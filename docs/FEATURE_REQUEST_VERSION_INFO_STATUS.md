# Feature Request: Version Info/Status Command

**Status**: ✅ Implemented  
**Date**: February 17, 2026  
**Version**: 1.4.0

## Motivation

Provide a single, easy-to-read CLI command that reports installation health, installed vs latest CLI version, sync status across apps, and a dependency graph with stale/out-of-sync indicators.

Reduce friction for monorepo maintainers who currently must run multiple commands or inspect files to determine version and sync health.

## Description

Add a `versioning status` command (with `versioning info` as an alias) that displays:

### Example CLI Output

```bash
$ versioning status
┌─────────────────────────────────────────────────────────┐
│          📊 Monorepo Versioning Status Report            │
└─────────────────────────────────────────────────────────┘

🔧 CLI Version Information
  Installed: v1.2.0
  Latest:    v1.2.0
  Status:    ✅ Up to date

📦 Core Version Sync
  Current Target: 1.1.3
  Synced: ✅ (All 12 packages in sync)
  Last Updated: 2026-02-17 14:32:00 UTC

📂 Applications Version Status
  ┌─────────────────────┬─────────┬──────────┬──────────┐
  │ App                 │ Version │ Status   │ Target   │
  ├─────────────────────┼─────────┼──────────┼──────────┤
  │ dashboard           │ 1.1.3   │ ✅ Sync  │ 1.1.3    │
  │ docs                │ 1.1.3   │ ✅ Sync  │ 1.1.3    │
  │ trader              │ 1.1.3   │ ✅ Sync  │ 1.1.3    │
  └─────────────────────┴─────────┴──────────┴──────────┘

📚 Packages Version Status
  ┌─────────────────────────────┬─────────┬──────────┐
  │ Package                     │ Version │ Status   │
  ├─────────────────────────────┼─────────┼──────────┤
  │ exchange-binance-futures    │ 1.1.3   │ ✅ Sync  │
  │ gcp-functions               │ 1.1.3   │ ✅ Sync  │
  │ trading-core                │ 1.1.3   │ ✅ Sync  │
  │ versioning                  │ 1.2.0   │ ⚠️ Newer │
  └─────────────────────────────┴─────────┴──────────┘

🔗 Dependency Graph Health
  Critical Dependencies:
    ✅ All versions locked correctly
    ✅ No circular dependencies detected
    ✅ 0 stale/out-of-date packages

⚡ Installation Health
  ✅ Node.js: v20.11.0 (Required: >=18.0.0)
  ✅ pnpm: v10.28.2 (Required: >=10.0.0)
  ✅ Git: Available
  ✅ Config: versioning.config.json found

🎯 Last Release
  Version: 1.1.3
  Date: 2026-02-10
  Commits: 47 since last release
  Next Suggested: Minor release (v1.2.0)

✅ Overall Status: HEALTHY - All systems synced and ready
```

### Optional Outputs

#### JSON Format (`--json`)

```json
{
  "timestamp": "2026-02-17T14:32:00Z",
  "cli": {
    "installed": "1.2.0",
    "latest": "1.2.0",
    "updateAvailable": false
  },
  "sync": {
    "currentTarget": "1.1.3",
    "isSynced": true,
    "syncedPackages": 12,
    "totalPackages": 13,
    "lastUpdated": "2026-02-17T14:32:00Z"
  },
  "apps": [
    { "name": "dashboard", "version": "1.1.3", "status": "sync", "target": "1.1.3" },
    { "name": "docs", "version": "1.1.3", "status": "sync", "target": "1.1.3" },
    { "name": "trader", "version": "1.1.3", "status": "sync", "target": "1.1.3" }
  ],
  "packages": [
    { "name": "exchange-binance-futures", "version": "1.1.3", "status": "sync" },
    { "name": "gcp-functions", "version": "1.1.3", "status": "sync" },
    { "name": "trading-core", "version": "1.1.3", "status": "sync" },
    { "name": "versioning", "version": "1.2.0", "status": "newer" }
  ],
  "dependencies": {
    "circularCount": 0,
    "staleCount": 0,
    "healthStatus": "healthy"
  },
  "environment": {
    "nodeVersion": "20.11.0",
    "pnpmVersion": "10.28.2",
    "gitAvailable": true,
    "configValid": true
  },
  "lastRelease": {
    "version": "1.1.3",
    "date": "2026-02-10",
    "commitsSince": 47
  },
  "overallStatus": "healthy"
}
```

#### Dependency Graph (`--dot`)

Generates Graphviz DOT format for visualization:

```
digraph VersionDependencies {
  dashboard -> "trading-core" [label="1.1.3"];
  dashboard -> "gcp-functions" [label="1.1.3"];
  trader -> "trading-core" [label="1.1.3"];
  trader -> "exchange-binance-futures" [label="1.1.3"];
  docs -> "versioning" [label="1.2.0", color="orange"];
}
```

## Scope

- **In scope**: Status reporting, sync validation, health checks, version comparisons
- **Out of scope**: Fixing version mismatches (handled by `sync` command)
- **Alias**: `versioning info` → `versioning status`

## Acceptance Criteria

- [x] Command registered in CLI with `status` and `info` aliases
- [x] Reads config from `versioning.config.json`
- [x] Detects and compares CLI version with package.json
- [x] Reports sync status across all tracked packages
- [x] Generates ASCII table output by default
- [x] Supports `--json` flag for machine-readable output
- [x] Supports `--dot` flag for dependency graph visualization
- [x] Detects stale/out-of-sync packages
- [x] Validates Git and Node.js environment
- [x] Shows commit count since last release
- [x] Suggests next version bump based on commits
- [x] Exit code 0 for healthy status, 1 for issues

## Implementation Touchpoints

### Files to Create/Modify

1. **`packages/versioning/src/status.ts`** (NEW)
   - `StatusManager` class implementing status reporting logic
   - Methods: `getStatus()`, `formatTable()`, `getJSON()`, `getDOT()`

2. **`packages/versioning/src/cli.ts`** (MODIFY)
   - Add `status` command with `info` alias
   - Options: `--json`, `--dot`, `--config <file>`
   - Integration with StatusManager

3. **`packages/versioning/src/__tests__/status.test.ts`** (NEW)
   - Unit tests for status command
   - Mock config, package files, git history

## Acceptance Tests

### Test 1: Command Registration

```typescript
it('should register status command with info alias', async () => {
  const result = await runCLI(['--help']);
  expect(result).toContain('status');
  expect(result).toContain('info');
});
```

### Test 2: Stale Version Detection

```typescript
it('should detect and flag stale packages', async () => {
  const status = await statusManager.getStatus();
  const stalePackages = status.packages.filter(p => p.status === 'stale');
  expect(stalePackages.length).toBeGreaterThan(0);
});
```

### Test 3: Sync Graph Generation

```typescript
it('should generate valid DOT graph', async () => {
  const dot = await statusManager.getDOT();
  expect(dot).toContain('digraph');
  expect(dot).toMatch(/dashboard\s*->/);
});
```

### Test 4: Invalid Config Handling

```typescript
it('should exit with error on missing config', async () => {
  const result = await runCLI(['status', '--config', '/nonexistent/config.json']);
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain('Config file not found');
});
```

### Test 5: JSON Output Validation

```typescript
it('should output valid JSON with --json flag', async () => {
  const result = await runCLI(['status', '--json']);
  const parsed = JSON.parse(result.stdout);
  expect(parsed).toHaveProperty('cli');
  expect(parsed).toHaveProperty('sync');
  expect(parsed).toHaveProperty('apps');
});
```

## Related Issues

- Monorepo maintainers need quick health status
- Currently requires multiple commands to verify sync state
- No single source of truth for version information

## Related PRs

This feature implements the status reporting capabilities needed for comprehensive version management across the monorepo.
