# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.6](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-03-01)

### Added
- 🔧 `readme-maintainer` extension (`versioning update-readme`) — auto-updates README with the latest CHANGELOG entry
- 🎯 Uses `package.json` version as authoritative source; falls back to highest semver in CHANGELOG
- 📂 Logs resolved paths for transparency
- 📝 `update-readme` script added to all packages and apps

### Fixed
- 🐛 Fixed README updater picking wrong version from malformed/misordered CHANGELOGs
- 🐛 Fixed `@ed/auth` → `@edcalderon/auth` import in `apps/dashboard`

## [1.4.5](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-02-13)

### Fixed
- 📝 Corrected extension version listing in documentation to reflect actual per-extension versions
- 🔧 Improved version tracking accuracy for extensions

## [1.4.4](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-02-13)

### Changed
- 📝 Added pre-commit linter to ensure README updates with version changes
- 🔧 Improved documentation maintenance workflow

## [1.4.3](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-02-13)

### Added
- 🔧 Added extension manager for centralized extension handling
- 📝 Added CHANGELOG files for all extensions
- 🔄 Updated CLI and sample extension with new features

## [1.4.2](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-02-13)

### Fixed
- 🐛 Fix pnpm audit vulnerabilities with override configuration
- 🔧 Improve error handling in StatusManager
- 📝 Add comprehensive documentation with badges
- 🔗 Add direct GitHub repository links in docs
- 📊 Enhanced status command formatting and error messages

## [1.4.1](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-02-13)

### Added
- ✨ New `versioning status` (aliased as `info`) command for health reporting
- 📈 Sync status across all apps and packages with detailed reporting
- 🎯 Support `--json` and `--dot` (Graphviz) output formats
- 🔍 Environment health checks (Node.js, pnpm, Git)
- 🎬 Last release info with suggested next version

## [1.4.0](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-02-12)

### Added
- ✨ Reentry status roadmap layer extension (v1.1.0)
- ✨ Automated GitHub daily screenshot and tweet (gcp-functions)

### Fixed
- 🐛 Add force-static export to API routes for static export compatibility
- 🐛 Add search method to supermemory wrapper
- 🐛 Change Next.js output to export for static GitHub Pages deployment
- 🐛 Lazy-load supermemory to allow builds without API key
- 🐛 Make environment variable check optional in deploy-web workflow
- 🐛 Pin pnpm version to 8.15.9 in GitHub Actions workflows for lockfile compatibility
- 🐛 Relax pnpm version requirement to >=8.0.0 for CI compatibility

## [1.3.0](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-02-13)

### Added
- ✨ Extension system with secrets-check, cleanup-repo, lifecycle-hooks, npm-publish, reentry-status extensions
- 🧩 Configurable extension manager via versioning.config.json
- 📝 Comprehensive USAGE.md and examples

## [1.2.0](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-01-15)

### Added
- ✨ Branch-aware versioning (`--branch-aware`, `--force-branch-aware`, `--format`, `--build`)
- 🌿 Branch rules in `versioning.config.json` with `feature/*`, `hotfix/*`, `develop`, `main` support
- 📝 USAGE.md with comprehensive examples

## [1.1.0](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-01-10)

### Added
- ✨ `versioning patch`, `versioning minor`, `versioning major` shorthand commands
- ✨ `versioning release <version>` custom version command
- ✨ NPM publish extension with 2FA/OTP support and local registry support
- 🔄 Version synchronization across monorepo packages

## [1.0.8](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-01-02)

### Fixed
- 🐛 Add permissions for GitHub release creation
- 🐛 Add publishConfig to explicitly set package as public
- 🐛 Change package name to @edcalderon/versioning
- 🐛 Correct tag existence check logic in create-tag.js
- 🐛 Update GitHub release action to use modern softprops/action-gh-release
- 🐛 Update repository URL in versioning package.json

### Added
- ✨ Add build provenance attestation
- ✨ Add comprehensive versioning package with CLI, changelog, and NPM publishing
- ✨ Add NPM publishing extension and update workflow

## [1.0.0](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-01-01)

### Added
- ✨ Initial release of @edcalderon/versioning
- ✨ Comprehensive versioning and changelog management
- ✨ Support for both single repositories and monorepos
- ✨ CLI tool with multiple commands (patch, minor, major, release, bump, changelog, sync, validate, init)
- ✨ Conventional commits integration
- ✨ Git tagging and committing
- ✨ Version synchronization across packages
- ✨ Package selection for selective releases
- ✨ TypeScript support with full type safety
- ✨ Jest testing framework
- ✨ NPM publishable package structure