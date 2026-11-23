# Add the thin Tauri shell

Status: pending

OpenSpec task: `tauri-desktop-shell` shell bootstrap slice.

## Acceptance Criteria

- [ ] `apps/desktop` builds the existing static dashboard output without a second UI implementation.
- [ ] Web and desktop builds use explicit environment configuration instead of a production site base path.
- [ ] Desktop startup, packaging, and the existing web build have automated smoke coverage.
- [ ] No private backend secrets are embedded in the desktop bundle.
