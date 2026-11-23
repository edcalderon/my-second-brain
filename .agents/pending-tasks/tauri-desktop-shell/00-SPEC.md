# Tauri Desktop Shell for Edward

Status: pending

OpenSpec change: Create `openspec/changes/tauri-desktop-shell/` before moving
the first implementation card to `active-tasks`.

## Goal

Deliver a Linux-first, installable Tauri 2 desktop application that reuses the
existing dashboard UI and preserves the web application as a supported target.
The desktop client shall add scoped native capabilities without making it a
trusted trading or HFT execution engine.

## Tasks

- [ ] 01: Create and approve the Tauri desktop OpenSpec change and workspace design.
- [ ] 02: Add the thin desktop shell around the static dashboard build.
- [ ] 03: Introduce browser-safe native capability interfaces and Tauri adapters.
- [ ] 04: Add desktop platform features and offline-safe data boundaries.
- [ ] 05: Add Linux packaging, release validation, and cross-platform readiness gates.

## Acceptance Criteria

- [ ] The dashboard UI remains reusable by the existing web build.
- [ ] Native calls are behind typed, least-privilege interfaces with browser fallbacks.
- [ ] Linux release artifacts and native capabilities are verified on supported desktop environments.
- [ ] Credentials, order execution, risk enforcement, and HFT strategy logic remain outside the desktop trust boundary.
- [ ] The eventual implementation follows test-first vertical slices for pure domain logic and integration tests for native adapters.
