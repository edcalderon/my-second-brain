# Re-entry Status + Roadmap examples

Files in this folder are copy/paste starting points.

- `versioning.config.reentryStatus.example.json`: example config with reentryStatus + roadmap + (optional) GitHub/Obsidian.
- `reentry.status.v1.1.example.json`: example canonical status (JSON).
- `REENTRY.md.example`: example generated REENTRY markdown.
- `ROADMAP.md.example`: example roadmap/backlog template with managed block markers.

Quick start:

```bash
# In your repo root:
cp packages/versioning/examples/reentry-status/versioning.config.reentryStatus.example.json versioning.config.json
versioning reentry init
versioning roadmap init --title "My Project"
versioning roadmap list
```
