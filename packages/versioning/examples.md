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
ed-version patch --packages "apps/dashboard"

# Create release for dashboard only
ed-version minor --packages "apps/dashboard" --message "Dashboard improvements"

# Validate dashboard version sync
ed-version validate
```

### Standalone Versioning for Versioning Package

The versioning package itself maintains independent versioning:

```bash
# In packages/versioning directory
cd packages/versioning
ed-version patch --skip-sync --message "Versioning tool improvements"
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
ed-version minor --message "Major feature rollout"
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