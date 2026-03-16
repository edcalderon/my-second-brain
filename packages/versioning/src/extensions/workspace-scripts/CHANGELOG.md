# Changelog — workspace-scripts extension

## [1.0.0] — 2026-03-16

### Added
- 🚀 Initial release of workspace-scripts extension
- 📋 `versioning scripts sync` — regenerate dev/build scripts from config into root package.json
- 📋 `versioning scripts list` — display current workspace script configuration
- 🔍 `versioning scripts detect` — find new workspace apps not yet tracked
- 👀 `versioning scripts preview` — preview generated scripts without writing
- 🔄 `postSync` hook — auto-detects new apps after version sync
- ⚙️ Config-driven: define apps, commands, args, ports in versioning.config.json
- 🏃 Runner support: `concurrently` (default) or `turbo`
- 📦 Managed script tracking — safely adds/updates/removes only scripts it owns
- 🔍 Auto-detection of new workspace packages from pnpm-workspace.yaml
