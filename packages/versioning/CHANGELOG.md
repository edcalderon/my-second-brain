## [1.5.3](https://github.com/edcalderon/my-second-brain/compare/v1.5.1...v1.5.3) (2026-03-22)


### Bug Fixes

* **auth:** add Supabase SQL templates ([274db4f](https://github.com/edcalderon/my-second-brain/commit/274db4fb81682a654dd4ef1d0aeb3653b3e780e7))
* **auth:** correct repository link and bump to v1.0.1 ([280f2d2](https://github.com/edcalderon/my-second-brain/commit/280f2d2f6f99f12199a986adfff4cb5843cc0411))
* **auth:** update lockfile after react-native peer bump and publish v1.1.1 ([8d95c64](https://github.com/edcalderon/my-second-brain/commit/8d95c6473d6bdf12c58c27f8175c5bf15ca42637))
* **auth:** update repository link to direct tree URL, bump to v1.0.2 ([85e2e0c](https://github.com/edcalderon/my-second-brain/commit/85e2e0c5603fae9d863e8cfe0bbb03b94e4f7a31))
* **ci:** use --frozen-lockfile to resolve @ed/auth workspace link from lockfile; remove packages/auth from monorepo versioning scope ([99e38c0](https://github.com/edcalderon/my-second-brain/commit/99e38c03abf6fa4c3ead41b0ad34840ef859a5e0))
* **release:** skip re-tagging on plain release command since tag exists from patch ([e1212e1](https://github.com/edcalderon/my-second-brain/commit/e1212e1fc141b3146e04220aa785565a51b88ae4))
* restore workspace:* for @ed/auth, disable syncDependencies to prevent overwrite on release ([e941714](https://github.com/edcalderon/my-second-brain/commit/e941714c52a3dcecc677919df4d0068245d67a41))
* **versioning:** execute postChangelog hook in release manager and run update-readme ([219e62e](https://github.com/edcalderon/my-second-brain/commit/219e62eb86b234eabf0ab7b306e10b864e2f0f51))


### Features

* **auth:** add canonical Authentik OIDC client helpers ([64fb5c6](https://github.com/edcalderon/my-second-brain/commit/64fb5c6a377614fd820cabaf46ac2aeaa476a5e4)), closes [#13](https://github.com/edcalderon/my-second-brain/issues/13)
* **auth:** add Web3 authentication support (SIWE/SIWS) v1.2.0 ([f585d46](https://github.com/edcalderon/my-second-brain/commit/f585d465d9ee8a7653b098ac550a780e94fc1c2d))
* **auth:** prepare @edcalderon/auth for NPM publishing ([ba57163](https://github.com/edcalderon/my-second-brain/commit/ba5716360d6c454286d9a349bcaf7f762f60fd6d))
* **auth:** Upgrade to fully universal compatibility (Web, Next, React Native) ([5c8aade](https://github.com/edcalderon/my-second-brain/commit/5c8aade273f021e56b19f75bec1ac17e6683e301))
* **versioning:** add workspace env extension ([c3c7131](https://github.com/edcalderon/my-second-brain/commit/c3c71315aabe8cb266a0a1b59a2194169471d19f))
* **versioning:** workspace-scripts extension v1.0.0 — auto-generate dev:all, build:all, per-app scripts ([adb586c](https://github.com/edcalderon/my-second-brain/commit/adb586cc7021fd6b554fe62884a3dc9d24b8c311))





## [1.5.2](https://github.com/edcalderon/my-second-brain/compare/v1.5.1...v1.5.2) (2026-03-22)


### Bug Fixes

* **auth:** add Supabase SQL templates ([274db4f](https://github.com/edcalderon/my-second-brain/commit/274db4fb81682a654dd4ef1d0aeb3653b3e780e7))
* **auth:** correct repository link and bump to v1.0.1 ([280f2d2](https://github.com/edcalderon/my-second-brain/commit/280f2d2f6f99f12199a986adfff4cb5843cc0411))
* **auth:** update lockfile after react-native peer bump and publish v1.1.1 ([8d95c64](https://github.com/edcalderon/my-second-brain/commit/8d95c6473d6bdf12c58c27f8175c5bf15ca42637))
* **auth:** update repository link to direct tree URL, bump to v1.0.2 ([85e2e0c](https://github.com/edcalderon/my-second-brain/commit/85e2e0c5603fae9d863e8cfe0bbb03b94e4f7a31))
* **ci:** use --frozen-lockfile to resolve @ed/auth workspace link from lockfile; remove packages/auth from monorepo versioning scope ([99e38c0](https://github.com/edcalderon/my-second-brain/commit/99e38c03abf6fa4c3ead41b0ad34840ef859a5e0))
* **release:** skip re-tagging on plain release command since tag exists from patch ([e1212e1](https://github.com/edcalderon/my-second-brain/commit/e1212e1fc141b3146e04220aa785565a51b88ae4))
* restore workspace:* for @ed/auth, disable syncDependencies to prevent overwrite on release ([e941714](https://github.com/edcalderon/my-second-brain/commit/e941714c52a3dcecc677919df4d0068245d67a41))


### Features

* **auth:** add canonical Authentik OIDC client helpers ([64fb5c6](https://github.com/edcalderon/my-second-brain/commit/64fb5c6a377614fd820cabaf46ac2aeaa476a5e4)), closes [#13](https://github.com/edcalderon/my-second-brain/issues/13)
* **auth:** add Web3 authentication support (SIWE/SIWS) v1.2.0 ([f585d46](https://github.com/edcalderon/my-second-brain/commit/f585d465d9ee8a7653b098ac550a780e94fc1c2d))
* **auth:** prepare @edcalderon/auth for NPM publishing ([ba57163](https://github.com/edcalderon/my-second-brain/commit/ba5716360d6c454286d9a349bcaf7f762f60fd6d))
* **auth:** Upgrade to fully universal compatibility (Web, Next, React Native) ([5c8aade](https://github.com/edcalderon/my-second-brain/commit/5c8aade273f021e56b19f75bec1ac17e6683e301))
* **versioning:** add workspace env extension ([c3c7131](https://github.com/edcalderon/my-second-brain/commit/c3c71315aabe8cb266a0a1b59a2194169471d19f))
* **versioning:** workspace-scripts extension v1.0.0 — auto-generate dev:all, build:all, per-app scripts ([adb586c](https://github.com/edcalderon/my-second-brain/commit/adb586cc7021fd6b554fe62884a3dc9d24b8c311))





## [1.5.2](https://github.com/edcalderon/my-second-brain/compare/v1.5.1...v1.5.2) (2026-03-22)


### Bug Fixes

* **auth:** add Supabase SQL templates ([274db4f](https://github.com/edcalderon/my-second-brain/commit/274db4fb81682a654dd4ef1d0aeb3653b3e780e7))
* **auth:** correct repository link and bump to v1.0.1 ([280f2d2](https://github.com/edcalderon/my-second-brain/commit/280f2d2f6f99f12199a986adfff4cb5843cc0411))
* **auth:** update lockfile after react-native peer bump and publish v1.1.1 ([8d95c64](https://github.com/edcalderon/my-second-brain/commit/8d95c6473d6bdf12c58c27f8175c5bf15ca42637))
* **auth:** update repository link to direct tree URL, bump to v1.0.2 ([85e2e0c](https://github.com/edcalderon/my-second-brain/commit/85e2e0c5603fae9d863e8cfe0bbb03b94e4f7a31))
* **ci:** use --frozen-lockfile to resolve @ed/auth workspace link from lockfile; remove packages/auth from monorepo versioning scope ([99e38c0](https://github.com/edcalderon/my-second-brain/commit/99e38c03abf6fa4c3ead41b0ad34840ef859a5e0))
* **release:** skip re-tagging on plain release command since tag exists from patch ([e1212e1](https://github.com/edcalderon/my-second-brain/commit/e1212e1fc141b3146e04220aa785565a51b88ae4))
* restore workspace:* for @ed/auth, disable syncDependencies to prevent overwrite on release ([e941714](https://github.com/edcalderon/my-second-brain/commit/e941714c52a3dcecc677919df4d0068245d67a41))


### Features

* **auth:** add canonical Authentik OIDC client helpers ([64fb5c6](https://github.com/edcalderon/my-second-brain/commit/64fb5c6a377614fd820cabaf46ac2aeaa476a5e4)), closes [#13](https://github.com/edcalderon/my-second-brain/issues/13)
* **auth:** add Web3 authentication support (SIWE/SIWS) v1.2.0 ([f585d46](https://github.com/edcalderon/my-second-brain/commit/f585d465d9ee8a7653b098ac550a780e94fc1c2d))
* **auth:** prepare @edcalderon/auth for NPM publishing ([ba57163](https://github.com/edcalderon/my-second-brain/commit/ba5716360d6c454286d9a349bcaf7f762f60fd6d))
* **auth:** Upgrade to fully universal compatibility (Web, Next, React Native) ([5c8aade](https://github.com/edcalderon/my-second-brain/commit/5c8aade273f021e56b19f75bec1ac17e6683e301))
* **versioning:** add workspace env extension ([c3c7131](https://github.com/edcalderon/my-second-brain/commit/c3c71315aabe8cb266a0a1b59a2194169471d19f))
* **versioning:** workspace-scripts extension v1.0.0 — auto-generate dev:all, build:all, per-app scripts ([adb586c](https://github.com/edcalderon/my-second-brain/commit/adb586cc7021fd6b554fe62884a3dc9d24b8c311))







# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-03-19)

### Fixed
- 🔧 Fixed `secrets-check` extension to use Husky v9 hook format (removed deprecated `._/husky.sh` sourcing)
- 🔧 Fixed `cleanup-repo` extension to use Husky v9 hook format
- 🔄 Enhanced `init` command to automatically set up husky and add `prepare` script to package.json
- ✨ Added optional `postinstall` hook to versioning package that conditionally sets up husky when consumed

### Changed
- 📝 Updated hook generation to be compatible with Husky v9+ (eliminates deprecation warnings in v10)

## [1.5.0](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-03-19)

### Added
- ✨ New `workspace-env` extension (v1.0.0)
  - `versioning env sync` to generate per-target `.env.local` and `.env.example` files from one canonical manifest
  - `versioning env doctor` to report missing required variables and unknown root env keys
  - `versioning env validate` for CI-friendly required variable validation with non-zero exit on missing vars
  - Supports manifest sources, aliases, canonical variable metadata, and target key mapping
- 🧪 Added unit coverage for env parsing, sync generation, validation logic, and command registration

## [1.4.7](https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning) (2026-03-16)

### Added
- ✨ New `workspace-scripts` extension (v1.0.0)
  - `versioning scripts sync` — auto-generate `dev:all`, `build:all`, and per-app scripts in root package.json
  - `versioning scripts list` — display current workspace script configuration
  - `versioning scripts detect` — find new workspace apps not yet tracked in config
  - `versioning scripts preview` — preview generated scripts without writing
- 🔄 `postSync` hook auto-detects new apps added to pnpm-workspace.yaml
- ⚙️ Config-driven via `extensionConfig.workspace-scripts` in versioning.config.json
- 🏃 Runner support: `concurrently` (default) or `turbo`
- 📦 Managed script tracking: safely adds/updates/removes only scripts it owns
- 🧪 Comprehensive test suite for workspace-scripts extension

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