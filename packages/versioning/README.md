# @edcalderon/versioning

A comprehensive versioning and changelog management tool designed for monorepos and single repositories. It provides automated version bumping, changelog generation using conventional commits, and version synchronization across multiple packages.

## Features

- 🚀 Automated version bumping (patch, minor, major, prerelease)
- 📝 Conventional commit-based changelog generation
- 🔄 Version synchronization across monorepo packages
- 🎯 Works with both monorepos and single repositories
- 📦 NPM publishable
- 🏷️ Git tagging and committing
- ✅ Validation of version sync

## Installation

```bash
npm install -g @edcalderon/versioning
# or
pnpm add -g @edcalderon/versioning
# or
yarn global add @edcalderon/versioning
```

## Quick Start

1. Initialize configuration:
```bash
ed-version init
```

2. Bump version and generate changelog:
```bash
ed-version bump patch
```

3. Sync versions across packages (for monorepos):
```bash
ed-version sync
```

### Edward's Monorepo Example

For this specific monorepo with dashboard app:

```bash
# Initialize config
ed-version init

# Edit versioning.config.json to:
{
  "packages": ["apps/dashboard"],
  "ignorePackages": ["packages/versioning"]
}

# Sync dashboard with main version
ed-version patch --packages "apps/dashboard"

# Versioning package maintains its own version
cd packages/versioning && ed-version patch --skip-sync
```

## Configuration

Create a `versioning.config.json` file in your project root:

For single repositories:
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

For monorepos:
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

### Configuration Options

- `rootPackageJson`: Path to the root package.json file
- `packages`: Array of glob patterns for packages to sync
- `changelogFile`: Path to the changelog file
- `conventionalCommits`: Whether to use conventional commits for changelog
- `syncDependencies`: Whether to sync internal dependencies
- `ignorePackages`: Array of package names to ignore during sync

## Commands

### Release Commands

#### `ed-version patch [options]`

Create a patch release (bumps 1.0.0 → 1.0.1)

```bash
ed-version patch
ed-version patch --packages "packages/app1,packages/app2" --message "Fix critical bug"
```

#### `ed-version minor [options]`

Create a minor release (bumps 1.0.0 → 1.1.0)

```bash
ed-version minor
ed-version minor --packages "apps/dashboard" --message "Add new features"
```

#### `ed-version major [options]`

Create a major release (bumps 1.0.0 → 2.0.0)

```bash
ed-version major --message "Breaking changes"
```

#### `ed-version release <version> [options]`

Create a custom release with specific version

```bash
ed-version release 1.2.3 --message "Custom release"
ed-version release 2.0.0-beta.1 --skip-sync
```

**Options for release commands:**
- `-p, --packages <packages>`: Comma-separated list of packages to sync
- `-m, --message <message>`: Release commit message
- `-c, --config <file>`: Config file path (default: versioning.config.json)
- `--no-tag`: Do not create git tag
- `--no-commit`: Do not commit changes
- `--skip-sync`: Skip version synchronization (for `release` command)

### Other Commands

Bump the version and generate changelog.

Types: `patch`, `minor`, `major`, `prerelease`

Options:
- `-p, --pre-release <identifier>`: Prerelease identifier
- `-c, --config <file>`: Config file path (default: versioning.config.json)
- `--no-commit`: Don't commit changes
- `--no-tag`: Don't create git tag

### `ed-version changelog [options]`

Generate changelog from commits.

Options:
- `-f, --from <commit>`: From commit
- `-t, --to <commit>`: To commit
- `-c, --config <file>`: Config file path

### `ed-version sync [options]`

Sync versions across all packages.

Options:
- `-v, --version <version>`: Target version to sync to
- `-c, --config <file>`: Config file path

### `ed-version validate [options]`

Validate that all packages have the correct version.

Options:
- `-c, --config <file>`: Config file path

### `ed-version init [options]`

Initialize a new versioning config file.

Options:
- `-f, --force`: Overwrite existing config

## Workflow Integration

### GitHub Actions

Add to your release workflow:

```yaml
- name: Bump version
  run: npx @edcalderon/versioning bump patch
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-commit Hooks

Use with husky for automated versioning:

```bash
npx husky add .husky/pre-commit "ed-version validate"
```

## Conventional Commits

This tool works best with conventional commits. Examples:

- `feat: add new feature` (minor bump)
- `fix: resolve bug` (patch bump)
- `BREAKING CHANGE: change API` (major bump)

## Documentation

- **[Usage Guide](USAGE.md)** - Comprehensive examples and advanced usage patterns
- **[Configuration Examples](examples.md)** - Real-world configuration examples
- **[CHANGELOG](CHANGELOG.md)** - Version history and changes

## Publishing & Releases

### Automated NPM Publishing

This package uses GitHub Actions for automated publishing to NPM when version tags are created.

#### Release Process

1. **Update Version**: Use the versioning commands to bump version and update changelog
   ```bash
   ed-version patch  # or minor, major
   ```

2. **Create Git Tag**: The package includes a helper script to create and push version tags
   ```bash
   npm run create-tag
   ```

3. **Automated Publishing**: GitHub Actions will automatically:
   - Build the package
   - Run tests
   - Publish to NPM
   - Create a GitHub Release

#### Manual Publishing (First Release)

For the initial release, publish manually:

```bash
cd packages/versioning
npm login
npm publish
```

#### NPM Token Setup

To enable automated publishing:

1. Go to [NPM](https://www.npmjs.com/) → Access Tokens → Generate New Token
2. Create a token with **Automation** scope
3. Add to GitHub repository secrets as `NPM_TOKEN`

### Version Tags

Tags should follow the format `v{major}.{minor}.{patch}` (e.g., `v1.0.0`, `v1.1.0`, `v2.0.0`).

The `create-tag` script will:
- Read the version from `package.json`
- Create an annotated git tag
- Push the tag to trigger the publish workflow