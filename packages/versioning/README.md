# @edcalderon/versioning

[![npm version](https://img.shields.io/npm/v/@edcalderon/versioning?style=flat-square&color=0ea5e9)](https://www.npmjs.com/package/@edcalderon/versioning)
[![npm downloads](https://img.shields.io/npm/dm/@edcalderon/versioning?style=flat-square&color=10b981)](https://www.npmjs.com/package/@edcalderon/versioning)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning)

A comprehensive versioning and changelog management tool designed for monorepos and single repositories. It provides automated version bumping, changelog generation using conventional commits, and version synchronization across multiple packages.

---

## 📋 Latest Changes (v1.4.6)

### Added
- 🔧 `readme-maintainer` extension (`versioning update-readme`) — auto-updates README with the latest CHANGELOG entry
- 🎯 Uses `package.json` version as authoritative source; falls back to highest semver in CHANGELOG
- 📂 Logs resolved paths for transparency
- 📝 `update-readme` script added to all packages and apps

### Fixed
- 🐛 Fixed README updater picking wrong version from malformed/misordered CHANGELOGs
- 🐛 Fixed `@ed/auth` → `@edcalderon/auth` import in `apps/dashboard`

For full version history, see [CHANGELOG.md](./CHANGELOG.md) and [GitHub releases](https://github.com/edcalderon/my-second-brain/releases)

---

## Features

- 🚀 Automated version bumping (patch, minor, major, prerelease)
- 🌿 Optional branch-aware versioning (`main`, `develop`, `feature/*`, `hotfix/*`)
- 📝 Conventional commit-based changelog generation
- 🔄 Version synchronization across monorepo packages
- 🎯 Works with both monorepos and single repositories
- 📦 NPM publishable
- 🏷️ Git tagging and committing
- ✅ Validation of version sync
- 🔌 **Extensible plugin system** for subdirectory-based extensions
- 🔒 **Security Checks** with automatic Husky integration
- 🧹 **Repository Cleanup** to keep root directory organized

## Installation

```bash
npm install -g @edcalderon/versioning
# or
pnpm add -g @edcalderon/versioning
# or
yarn global add @edcalderon/versioning
```

## Extensions

The versioning tool supports a **composable extension system** that allows you to add custom business logic and commands. Extensions can:

- Add new CLI commands
- Hook into existing workflows (pre/post version bumps, releases, etc.)
- Integrate with external services
- Implement custom versioning strategies

Extensions are loaded automatically from:
- Built-in extensions in subdirectories of `src/extensions/` (e.g. `src/extensions/reentry-status/index.ts`)
- External packages listed in `versioning.config.json`

### Creating Extensions

Extensions are TypeScript modules that implement the `VersioningExtension` interface:

```typescript
import { Command } from 'commander';
import { VersioningExtension } from '@edcalderon/versioning';

const extension: VersioningExtension = {
  name: 'my-extension',
  description: 'My custom extension',
  version: '1.0.0',

  register: async (program: Command, config: any) => {
    // Add custom commands here
    program
      .command('my-command')
      .description('My custom command')
      .action(async () => {
        console.log('Custom command executed!');
      });
  },

  hooks: {
    preVersion: async (type: string, options: any) => {
      console.log(`About to bump ${type} version...`);
    },
    postVersion: async (type: string, version: string, options: any) => {
      console.log(`Version bumped to ${version}`);
    }
  }
};

export default extension;
```

### Extension Hooks

Extensions can hook into the versioning lifecycle:

- `preVersion`: Called before version bump
- `postVersion`: Called after version bump
- `preRelease`: Called before release creation
- `postRelease`: Called after release creation
- `preChangelog`: Called before changelog generation
- `postChangelog`: Called after changelog generation
- `preSync`: Called before version sync
- `postSync`: Called after version sync

### Built-in Extensions

#### Lifecycle Hooks Extension

Demonstrates all available hooks with example business logic:

```bash
versioning hooks list    # List available hooks
versioning hooks run pre-deploy  # Manually run a hook
```

#### NPM Publish Extension

Handles NPM publishing with custom logic:

```bash
versioning publish-package --tag latest
versioning publish-local --registry http://localhost:4873
```

Features:
- Automatic package building
- Prepublish checks
- Publication verification
- 2FA/OTP support
- Local registry support
- Dry-run mode

### Re-entry Status + Roadmap Extension

Maintains a fast **re-entry** layer (current state + next micro-step) and a slow **roadmap/backlog** layer (long-term plan).

Canonical files:

Single-project (default):
- `.versioning/reentry.status.json` (machine)
- `.versioning/REENTRY.md` (generated, minimal diffs)
- `.versioning/ROADMAP.md` (human-first; only a small managed header block is auto-updated)

Multi-project (scoped by `--project <name>`):
- `.versioning/projects/<project>/reentry.status.json`
- `.versioning/projects/<project>/REENTRY.md`
- `.versioning/projects/<project>/ROADMAP.md`

**Smart Features:**
- **Auto-Update:** `versioning reentry update` infers the project phase and next step from your last git commit.
  - `feat: ...` → **Phase: development**
  - `fix: ...` → **Phase: maintenance**
- **Git Context:** Automatically links status to the latest branch, commit, and author.

Commands:

```bash
# Fast layer
versioning reentry init
versioning reentry update        # Auto-update status from git commit
versioning reentry show          # Show current status summary
versioning reentry sync

# Fast layer (scoped)
versioning reentry init --project trader
versioning reentry update --project trader
versioning reentry show --project trader

# Slow layer
versioning roadmap init --title "My Project"
versioning roadmap list
versioning roadmap set-milestone --id "now-01" --title "Ship X"
```

#### Cleanup Repo Extension

Keeps your repository root clean by organizing stray files into appropriate directories (docs, scripts, config, archive).

Features:
- **Smart Scanning:** Identifies files that don't belong in the root.
- **Configurable Routes:** Map extensions to folders (e.g. `.sh` → `scripts/`).
- **Safety:** Allowlist for root files and Denylist for forced moves.
- **Husky Integration:** Auto-scan or auto-move on commit.

Commands:

```bash
versioning cleanup scan          # Dry-run scan of root
versioning cleanup move          # Move files to configured destinations
versioning cleanup restore       # Restore a moved file
versioning cleanup config        # View/manage configuration
versioning cleanup husky         # Setup git hook (scan-only by default)
```

Configuration (`versioning.config.json`):

```json
{
  "extensionConfig": {
    "cleanup-repo": {
      "enabled": true,
      "defaultDestination": "docs",
      "allowlist": ["CHANGELOG.md"],
      "routes": {
        ".sh": "scripts",
        ".json": "config"
      }
    }
  }
}
```

#### Secrets Check Extension

Prevents sensitive data (private keys, tokens, mnemonics) from being committed to the repository.

Features:
- **Pre-defined Patterns:** Detects AWS, GitHub, NPM tokens, private keys, and EVM mnemonics.
- **Allowlist:** Ignore false positives or specific test keys.
- **Husky Integration:** Easy CLI setup to block commits containing secrets.

Commands:

```bash
versioning check-secrets         # Scan staged files for secrets
versioning check-secrets husky   # Add blocking secrets check to pre-commit hook
```

Configuration (`versioning.config.json`):

```json
{
  "extensionConfig": {
    "secrets-check": {
      "enabled": true,
      "patterns": [
        "CUSTOM_API_KEY=[0-9a-f]{32}"
      ],
      "allowlist": [
        "ETHERSCAN_API_KEY=YOUR_KEY"
      ]
    }
  }
}
```

### External Extensions

To use external extensions, add them to your `versioning.config.json`:

```json
{
  "extensions": [
    "my-versioning-extension",
    {
      "name": "another-extension",
      "path": "./local-extensions/another-extension"
    }
  ]
}
```

External extensions should be published as NPM packages with the naming convention `*-versioning-extension` or implement the `VersioningExtension` interface.

### Extension Development

1. Create a new TypeScript file in `src/extensions/`
2. Implement the `VersioningExtension` interface
3. Export the extension as default
4. The extension will be loaded automatically

For external extensions:
1. Create a separate NPM package
2. Export the extension as the main module
3. Publish to NPM
4. Install and configure in target projects

### Extension API Reference

#### VersioningExtension Interface

```typescript
interface VersioningExtension {
  name: string;                    // Extension name
  description: string;             // Extension description
  version: string;                 // Extension version
  register: (program: Command, config: any) => void | Promise<void>;
  hooks?: ExtensionHooks;          // Optional lifecycle hooks
}
```

#### ExtensionHooks Interface

```typescript
interface ExtensionHooks {
  preVersion?: (type: string, options: any) => void | Promise<void>;
  postVersion?: (type: string, version: string, options: any) => void | Promise<void>;
  preRelease?: (version: string, options: any) => void | Promise<void>;
  postRelease?: (version: string, options: any) => void | Promise<void>;
  preChangelog?: (options: any) => void | Promise<void>;
  postChangelog?: (options: any) => void | Promise<void>;
  preSync?: (options: any) => void | Promise<void>;
  postSync?: (options: any) => void | Promise<void>;
}
```

### Extension Context

Extensions can access the versioning context:

```typescript
import { getExtensionContext } from '@edcalderon/versioning';

const context = getExtensionContext();
if (context) {
  // Access versionManager, changelogManager, etc.
}
```

## Quick Start

1. Initialize configuration:
```bash
versioning init
```

2. Bump version and generate changelog:
```bash
versioning bump patch
```

3. Sync versions across packages (for monorepos):
```bash
versioning sync
```

### Edward's Monorepo Example

For this specific monorepo with dashboard app:

```bash
# Initialize config
versioning init

# Edit versioning.config.json to:
{
  "packages": ["apps/dashboard"],
  "ignorePackages": ["packages/versioning"]
}

# Sync dashboard with main version
versioning patch --packages "apps/dashboard"

# Versioning package maintains its own version
cd packages/versioning && versioning patch --skip-sync
```

### Internal Versioning

This versioning package uses its own versioning system internally for development and releases:

```bash
# Bump version internally
npm run version:patch    # Bump patch version
npm run version:minor    # Bump minor version
npm run version:major    # Bump major version

# Generate changelog
npm run changelog

# Publish to NPM
npm run publish:npm      # Publish to NPM
npm run publish:npm -- --tag beta  # Publish with specific tag

# Publish to local registry for testing
npm run publish:local

# Create and push version tag
npm run create-tag

# Complete release process
npm run release          # Bump version, changelog, create tag
npm run release:local    # Bump version, changelog, publish locally
```

The package maintains its own version using the same tooling it provides, ensuring consistency and testing the functionality in production. The NPM publishing extension handles all the complex publishing logic including building, verification, and 2FA support.

#### NPM Publish Extension

The package includes a built-in NPM publishing extension for streamlined publishing:

```bash
# Publish to NPM
npm run publish:npm

# Publish to NPM with specific tag
npm run publish:npm -- --tag beta

# Publish to local registry for testing
npm run publish:local

# Publish to custom local registry
npm run publish:local -- --registry http://localhost:4873
```

The extension automatically:
- Builds the package if needed
- Runs prepublish checks
- Verifies publication
- Handles 2FA/OTP if required
- Supports dry-run mode

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
  "ignorePackages": [],
  "branchAwareness": {
    "enabled": false,
    "defaultBranch": "main",
    "branches": {
      "main": {
        "versionFormat": "semantic",
        "tagFormat": "v{version}",
        "syncFiles": ["package.json", "version.production.json"],
        "environment": "production",
        "bumpStrategy": "semantic"
      },
      "develop": {
        "versionFormat": "dev",
        "tagFormat": "v{version}",
        "syncFiles": ["version.development.json"],
        "environment": "development",
        "bumpStrategy": "dev-build"
      },
      "feature/*": {
        "versionFormat": "feature",
        "tagFormat": "v{version}",
        "syncFiles": ["version.development.json"],
        "environment": "development",
        "bumpStrategy": "feature-branch"
      },
      "hotfix/*": {
        "versionFormat": "hotfix",
        "tagFormat": "v{version}",
        "syncFiles": ["version.development.json"],
        "environment": "development",
        "bumpStrategy": "hotfix"
      }
    }
  }
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
- `branchAwareness`: Optional branch-aware release rules and file sync targets
- `branchAwareness.branches.<pattern>.versionFormat`: `semantic`, `dev`, `feature`, `hotfix`, or custom
- `branchAwareness.branches.<pattern>.syncFiles`: Only these files are updated when branch-aware mode is enabled

### Branch-Aware Releases

Enable branch-aware mode per command:

```bash
versioning patch --branch-aware
versioning patch --branch-aware --target-branch develop
versioning patch --branch-aware --format dev --build 396
versioning minor --branch-aware
versioning major --branch-aware
```

Behavior summary:
- Exact branch names are checked first (e.g. `main`, `develop`)
- Wildcard patterns are checked next (e.g. `feature/*`, `hotfix/*`)
- If no match is found, the `defaultBranch` rule is used
- `--force-branch-aware` enables branch-aware behavior even when `branchAwareness.enabled` is `false`
- Full config template: `packages/versioning/examples/versioning.config.branch-aware.json`

## Commands

### Release Commands

#### `versioning patch [options]`

Create a patch release (bumps 1.0.0 → 1.0.1)

```bash
versioning patch
versioning patch --packages "packages/app1,packages/app2" --message "Fix critical bug"
```

#### `versioning minor [options]`

Create a minor release (bumps 1.0.0 → 1.1.0)

```bash
versioning minor
versioning minor --packages "apps/dashboard" --message "Add new features"
```

#### `versioning major [options]`

Create a major release (bumps 1.0.0 → 2.0.0)

```bash
versioning major --message "Breaking changes"
```

#### `versioning release <version> [options]`

Create a custom release with specific version

```bash
versioning release 1.2.3 --message "Custom release"
versioning release 2.0.0-beta.1 --skip-sync
```

**Options for `patch`, `minor`, and `major`:**
- `-p, --packages <packages>`: Comma-separated list of packages to sync
- `-m, --message <message>`: Release commit message
- `-c, --config <file>`: Config file path (default: versioning.config.json)
- `--branch-aware`: Enable branch-aware release behavior
- `--force-branch-aware`: Force branch-aware mode even if disabled in config
- `--target-branch <branch>`: Explicit branch to resolve branch rules
- `--format <format>`: Override the configured branch version format
- `--build <number>`: Override build number for non-semantic branch formats
- `--no-tag`: Do not create git tag
- `--no-commit`: Do not commit changes

**Options for `release <version>`:**
- `-p, --packages <packages>`: Comma-separated list of packages to sync
- `-m, --message <message>`: Release commit message
- `-c, --config <file>`: Config file path (default: versioning.config.json)
- `--no-tag`: Do not create git tag
- `--no-commit`: Do not commit changes
- `--skip-sync`: Skip version synchronization

### Other Commands

Bump the version and generate changelog.

Types: `patch`, `minor`, `major`, `prerelease`

Options:
- `-p, --pre-release <identifier>`: Prerelease identifier
- `-c, --config <file>`: Config file path (default: versioning.config.json)
- `--no-commit`: Don't commit changes
- `--no-tag`: Don't create git tag

### `versioning changelog [options]`

Generate changelog from commits.

Options:
- `-f, --from <commit>`: From commit
- `-t, --to <commit>`: To commit
- `-c, --config <file>`: Config file path

### `versioning sync [options]`

Sync versions across all packages.

Options:
- `-v, --version <version>`: Target version to sync to
- `-c, --config <file>`: Config file path

### `versioning validate [options]`

Validate that all packages have the correct version.

Options:
- `-c, --config <file>`: Config file path

### `versioning init [options]`

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
npx husky add .husky/pre-commit "versioning validate"
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

1. **Update Version**: Use the internal versioning scripts to bump version and update changelog
   ```bash
   npm run version:patch  # or version:minor, version:major
   npm run changelog
   ```

2. **Publish Locally (Optional)**: Test publishing to a local registry
   ```bash
   npm run publish:local
   ```

3. **Create Git Tag**: Use the create-tag script to create and push version tags
   ```bash
   npm run create-tag
   ```

4. **Automated Publishing**: GitHub Actions will automatically publish to NPM using the publish extension

#### Quick Release Commands

```bash
# Full production release
npm run release          # Bump version, changelog, create tag

# Local testing release
npm run release:local    # Bump version, changelog, publish locally

# Manual publishing
npm run publish:npm      # Publish current version to NPM
npm run publish:npm -- --tag beta  # Publish with specific tag
```

This uses the same versioning and publishing logic that the package provides to users, ensuring the tool "eats its own dog food".

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
