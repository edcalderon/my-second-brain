# Add the native capability bridge

Status: pending

OpenSpec task: `tauri-desktop-shell` native bridge slice.

## Acceptance Criteria

- [ ] Shared components call typed capability interfaces rather than Tauri globals directly.
- [ ] Browser implementations provide safe fallbacks or explicit unavailable states.
- [ ] Tauri permissions grant only the filesystem, notification, shortcut, tray, and storage operations actually required.
- [ ] Unit tests cover capability selection and error handling; native adapters have integration coverage.
