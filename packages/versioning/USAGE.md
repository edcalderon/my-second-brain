# Usage Guide for ed-versioning

This guide provides comprehensive examples of using the versioning system for both single repositories and complex monorepos.

## Table of Contents

- [Quick Start](#quick-start)
- [Single Repository Usage](#single-repository-usage)
- [Monorepo Usage](#monorepo-usage)
- [Advanced Examples](#advanced-examples)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Installation

```bash
npm install -g ed-versioning
# or
pnpm add -g ed-versioning
# or
yarn global add ed-versioning
```

### Basic Setup

```bash
# Initialize versioning config
ed-version init

# Create your first patch release
ed-version patch
```

## Single Repository Usage

Perfect for standalone projects, libraries, or applications.

### Basic Setup

```bash
# Initialize for single repo (default configuration)
ed-version init
```

This creates `versioning.config.json`:

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

### Creating Releases

#### Patch Release (1.0.0 → 1.0.1)
```bash
ed-version patch
```

**What happens:**
1. Bumps version in `package.json` from `1.0.0` to `1.0.1`
2. Generates changelog from conventional commits
3. Updates `CHANGELOG.md` with new entries
4. Creates git commit with message "chore: release v1.0.1"
5. Creates git tag `v1.0.1`

#### Minor Release (1.0.0 → 1.1.0)
```bash
ed-version minor --message "Add user authentication"
```

**What happens:**
1. Bumps version to `1.1.0`
2. Generates changelog
3. Uses custom commit message
4. Creates tag `v1.1.0`

#### Major Release (1.0.0 → 2.0.0)
```bash
ed-version major --message "Breaking API changes"
```

### Custom Release
```bash
ed-version release 1.2.3 --message "Hotfix for critical bug"
```

### Files Modified

After running `ed-version patch`, your files will be:

**package.json:**
```json
{
  "name": "my-project",
  "version": "1.0.1",
  ...
}
```

**CHANGELOG.md:**
```markdown
# Changelog

## [1.0.1] - 2026-01-01

### Fixed
- Fix critical bug in user login

## [1.0.0] - 2026-01-01

### Added
- Initial release
```

### Skipping Steps

```bash
# Create release but don't commit or tag
ed-version patch --no-commit --no-tag

# Just bump version and generate changelog locally
ed-version patch --no-commit --no-tag
```

## Monorepo Usage

Advanced usage for monorepos with multiple packages and applications.

### Monorepo Setup

```bash
# Initialize config
ed-version init

# Edit versioning.config.json for monorepo
```

**versioning.config.json for monorepo:**
```json
{
  "rootPackageJson": "package.json",
  "packages": ["packages/*", "apps/*"],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": true,
  "ignorePackages": []
}
```

### Full Monorepo Release

```bash
ed-version patch
```

**What happens:**
1. Updates root `package.json` version
2. Updates all `packages/*/package.json` versions
3. Updates all `apps/*/package.json` versions
4. Syncs internal dependencies between packages
5. Generates changelog from all commits
6. Creates commit and tag

### Selective Package Sync

Sync only specific packages instead of all:

```bash
# Sync only API and dashboard
ed-version patch --packages "packages/api,apps/dashboard"

# Sync only the web app
ed-version minor --packages "apps/web"
```

### Excluding Packages

Use `ignorePackages` to exclude certain packages from sync:

```json
{
  "packages": ["packages/*", "apps/*"],
  "ignorePackages": ["packages/versioning", "packages/docs"]
}
```

Or exclude during release:

```bash
# This will sync all except ignored packages
ed-version patch
```

## Advanced Examples

### Example: Edward's Monorepo

For this specific monorepo structure:

```json
{
  "rootPackageJson": "package.json",
  "packages": ["packages/*"],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": true,
  "ignorePackages": []
}
```

#### Sync dashboard app only
```bash
ed-version patch --packages "apps/dashboard"
```

#### Sync all packages except versioning
```json
{
  "ignorePackages": ["packages/versioning"]
}
```

### Complex Monorepo with Multiple Teams

```json
{
  "rootPackageJson": "package.json",
  "packages": [
    "packages/api",
    "packages/ui",
    "packages/utils",
    "apps/web",
    "apps/mobile",
    "apps/desktop"
  ],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": true,
  "ignorePackages": ["packages/docs", "packages/examples"]
}
```

#### Team-specific releases
```bash
# Frontend team release
ed-version minor --packages "packages/ui,packages/utils,apps/web" --message "Frontend improvements"

# API team release
ed-version patch --packages "packages/api" --message "API performance fixes"

# Mobile team release
ed-version patch --packages "apps/mobile" --message "Mobile bug fixes"
```

### Standalone Versioning for Individual Packages

For packages that need independent versioning:

```bash
# Version only the API package independently
ed-version release 2.0.0 --packages "packages/api" --skip-sync --message "API v2 release"
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install versioning tool
        run: npm install -g @ed/versioning

      - name: Create release
        run: ed-version patch

      - name: Push changes
        run: |
          git push
          git push --tags
```

### Automated Releases

```yaml
name: Automated Patch Release
on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install versioning
        run: npm install -g @ed/versioning

      - name: Create patch release
        run: ed-version patch --message "Automated patch release"

      - name: Push changes
        run: |
          git push
          git push --tags
```

## Troubleshooting

### Version Sync Issues

```bash
# Check if versions are in sync
ed-version validate

# Fix version mismatches
ed-version sync
```

### Changelog Generation Issues

```bash
# Generate changelog manually
ed-version changelog

# Generate changelog for specific commits
ed-version changelog --from abc123 --to def456
```

### Git Issues

```bash
# If git operations fail, check status
git status

# Reset and try again
git reset --hard HEAD~1
ed-version patch
```

### Common Problems

**"Config file not found"**
```bash
ed-version init
```

**"No conventional commits found"**
- Ensure commits follow conventional format: `feat:`, `fix:`, `chore:`, etc.

**"Version bump failed"**
- Check current version in package.json
- Ensure semantic versioning rules are followed

## Best Practices

### Commit Message Conventions

```bash
feat: add user authentication
fix: resolve login bug
docs: update API documentation
chore: update dependencies
refactor: simplify user service
test: add unit tests for auth
```

### Version Strategy

- **Patch (1.0.0 → 1.0.1)**: Bug fixes, small changes
- **Minor (1.0.0 → 1.1.0)**: New features, backwards compatible
- **Major (1.0.0 → 2.0.0)**: Breaking changes

### Monorepo Organization

- Use consistent package naming: `@scope/package-name`
- Keep internal dependencies updated
- Use `ignorePackages` for documentation/tools packages
- Document release processes for each team

### Release Workflow

1. Develop features on feature branches
2. Merge to main with conventional commits
3. Run `ed-version validate` to check sync
4. Create release: `ed-version patch/minor/major`
5. Push commits and tags
6. CI/CD handles publishing

This versioning system provides flexibility for any project structure while maintaining consistency and automation.