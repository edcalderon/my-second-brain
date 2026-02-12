# Migration Kickoff (Kiro Task 1.1 + Project State)

This repository now includes the initial monorepo scaffold from the Binance Futures Platform migration plan:

- Workspaces: `apps/*`, `packages/*`
- New workspaces: `apps/executor`, `apps/market-data`, `apps/strategy`, `packages/core`, `packages/exchange`
- Root strict TypeScript config for Bun-era code (`tsconfig.json`)

## Versioning + Re-entry state

The project uses `@edcalderon/versioning` for release/version synchronization and fast re-entry project state tracking.

### Initialize state files

```bash
npm run state:init
```

This creates/updates:

- `.versioning/reentry.status.json` (machine-readable current state)
- `.versioning/REENTRY.md` (quick human handoff)
- `.versioning/ROADMAP.md` (longer horizon roadmap)

### Sync re-entry state after updates

```bash
npm run state:sync
```

### Versioning workflow

```bash
npm run versioning:validate
npm run versioning:sync
npm run version:patch
```

## Next implementation target

Proceed with Kiro Task **1.2** in `packages/core`:

- Add `zod` + `dotenv`
- Build typed config schema + loader
- Add `.env.example` fields for the new platform services
