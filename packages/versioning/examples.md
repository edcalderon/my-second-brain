# Example Configurations

## Edward's Monorepo Configuration

For this specific monorepo structure, here's how to configure versioning:

### Basic Monorepo Sync

```json
{
  "rootPackageJson": "package.json",
  "packages": ["apps/dashboard"],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": true,
  "ignorePackages": ["packages/versioning"]
}
```

### Usage Examples

```bash
# Sync dashboard app with main version
versioning patch --packages "apps/dashboard"

# Create release for dashboard only
versioning minor --packages "apps/dashboard" --message "Dashboard improvements"

# Validate dashboard version sync
versioning validate
```

## Re-entry Status + Roadmap (v1.1)

Enable the extension (built-in) via `versioning.config.json`:

```json
{
  "extensions": [],
  "reentryStatus": {
    "enabled": true,
    "autoSync": true,
    "failHard": false,
    "files": {
      "jsonPath": ".versioning/reentry.status.json",
      "markdownPath": ".versioning/REENTRY.md"
    }
  }
}
```

Roadmap/backlog commands:

```bash
versioning reentry init
versioning roadmap init --title "My Project"
versioning roadmap add --section "Now (1–2 weeks)" --id "now-01" --item "Ship stable integration"
versioning roadmap list
versioning roadmap set-milestone --id "now-01" --title "Ship stable integration"
versioning reentry sync
```

### Standalone Versioning for Versioning Package

The versioning package itself maintains independent versioning:

```bash
# In packages/versioning directory
cd packages/versioning
versioning patch --skip-sync --message "Versioning tool improvements"
```

### Full Monorepo Release

For releases affecting the entire monorepo:

```json
{
  "rootPackageJson": "package.json",
  "packages": ["apps/*", "packages/*"],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": true,
  "ignorePackages": ["packages/versioning", "packages/docs"]
}
```

```bash
# Full monorepo release
versioning minor --message "Major feature rollout"
```

## Configuration Templates

### Single Repository
```json
{
  "rootPackageJson": "package.json",
  "packages": [],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": false,
  "ignorePackages": []
}
```

### Monorepo with Selective Sync
```json
{
  "rootPackageJson": "package.json",
  "packages": ["packages/*", "apps/*"],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": true,
  "ignorePackages": ["packages/docs", "packages/examples"]
}
```

### Microservices Architecture
```json
{
  "rootPackageJson": "package.json",
  "packages": ["services/*", "libs/*", "apps/*"],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": true,
  "ignorePackages": ["services/legacy", "libs/deprecated"]
}
```