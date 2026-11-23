# Package and validate the desktop release

Status: pending

OpenSpec task: `tauri-desktop-shell` release slice.

## Acceptance Criteria

- [ ] CI produces Linux `.deb` and AppImage artifacts with a documented support matrix.
- [ ] Release validation covers GNOME and KDE notification/tray behavior where those features are enabled.
- [ ] Windows installer and macOS signing/notarization requirements are documented as future release gates.
- [ ] Updates are signed where self-update is offered; distribution-managed packages follow their platform update model.
