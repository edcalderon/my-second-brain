---
sidebar_position: 3
---

# Versioning System

The `@edcalderon/versioning` tool is a comprehensive versioning and changelog management system designed for this monorepo. It handles semantic versioning, synchronization across packages, and provides a powerful extension system.

## Key Features

- **🚀 Automated Versioning**: Patch, minor, and major bumps with automated changelog generation.
- **🔌 Extension System**: Composable plugins for custom logic (Reentry, Tasks, Cleanup, Secrets).
- **🔒 Security Enforcement**: Built-in secrets scanning to prevent sensitive data leaks.
- **🧹 Repo Cleanup**: Automated organization of stray files in the repository root.

## Core Commands

### Version Management
```bash
# Bump version and generate changelog
npx versioning patch
npx versioning minor
npx versioning major

# Sync versions across monorepo packages
npx versioning sync
```

### Security & Cleanup
```bash
# Scan staged files for secrets
npx versioning check-secrets

# Setup blocking pre-commit hook for secrets
npx versioning check-secrets husky

# Scan root directory for stray files
npx versioning cleanup scan

# Move stray files to designated folders
npx versioning cleanup move
```

### Task Tracking
```bash
# Inspect the task inventory
npx versioning tasks list
npx versioning tasks list --feature wallet --status active

# Create or archive tasks
npx versioning tasks add active-tasks/wallet/01-build-ui.md
npx versioning tasks add active-tasks/wallet/00-SPEC.md
npx versioning tasks archive active-tasks/wallet/01-build-ui.md

# Regenerate indexes and validate drift
npx versioning tasks sync
npx versioning tasks validate
npx versioning reentry validate
```

For a pre-commit or pre-push guard:
```bash
npx versioning tasks validate && npx versioning reentry validate
```

## Configuration

The system is configured via `versioning.config.json` in the repository root.

### Example Configuration
```json
{
  "packages": ["apps/*", "packages/*"],
  "ignorePackages": ["packages/versioning"],
  "extensionConfig": {
    "reentry-status": { "enabled": true },
    "secrets-check": { "enabled": true },
    "cleanup-repo": {
      "defaultDestination": "docs",
      "routes": {
        ".sh": "scripts",
        ".json": "config"
      }
    }
  }
}
```

## Extensions

### Reentry Status
Maintains a two-layer status system:
- **Fast layer**: Current state + next micro-step in `REENTRY.md`.
- **Slow layer**: Long-term Roadmap in `ROADMAP.md`.

### Secrets Check
Scans for AWS keys, GitHub tokens, private keys, and EVM mnemonics. It can be integrated into Husky to block non-compliant commits.

### Cleanup Repo
Organizes the repository root by moving files into `docs/`, `scripts/`, `config/`, etc., based on extension-to-folder mapping.
