```markdown
# my-second-brain Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill introduces the key development patterns, coding conventions, and common workflows used in the `my-second-brain` repository. The project is a TypeScript monorepo built with Next.js, featuring modular agent-based architecture, a dashboard application, and several packages. It emphasizes maintainable code, clear commit history, and automated workflows for feature development, ECC bundle management, and package releases.

---

## Coding Conventions

### File Naming

- Use **camelCase** for file and directory names.
  - Example: `hummingbotApi.ts`, `mySecondBrainInstincts.yaml`

### Import Style

- Use **alias imports** for internal modules.
  - Example:
    ```typescript
    import { fetchMarketData } from '@/lib/hummingbot-api';
    ```

### Export Style

- Use **default exports** for modules.
  - Example:
    ```typescript
    const Sidebar = () => { /* ... */ };
    export default Sidebar;
    ```

### Commit Messages

- Follow **Conventional Commits** with prefixes:
  - `chore`, `feat`, `fix`, `docs`
- Keep commit messages concise (~58 characters on average).
  - Example: `feat: add execution page to dashboard app`

---

## Workflows

### ecc-bundle-addition

**Trigger:** When introducing or updating an ECC (Extended Cognitive Component) bundle or capability for the `my-second-brain` agent ecosystem.  
**Command:** `/add-ecc-bundle`

**Steps:**
1. Add or update `.agents/skills/my-second-brain/SKILL.md` with skill documentation.
2. Add or update agent configuration: `.agents/skills/my-second-brain/agents/openai.yaml`.
3. Add or update `.claude/skills/my-second-brain/SKILL.md` for Claude-specific skills.
4. Add or update command documentation:
    - `.claude/commands/database-migration.md`
    - `.claude/commands/feature-development.md`
    - `.claude/commands/test-driven-development.md`
5. Update ECC tools and instincts:
    - `.claude/ecc-tools.json`
    - `.claude/homunculus/instincts/inherited/my-second-brain-instincts.yaml`
6. Update identity and agent registry:
    - `.claude/identity.json`
    - `.codex/AGENTS.md`
7. Update agent TOML configs and global config:
    - `.codex/agents/docs-researcher.toml`
    - `.codex/agents/explorer.toml`
    - `.codex/agents/reviewer.toml`
    - `.codex/config.toml`
8. Commit all changes with a conventional message.

**Example Commit:**
```
feat: add ECC bundle for new agent skill
```

---

### dashboard-feature-wiring

**Trigger:** When adding, updating, or wiring up new features or pages in the dashboard application.  
**Command:** `/dashboard-feature`

**Steps:**
1. Edit or add dashboard pages:
    - `apps/dashboard/src/app/*/page.tsx` (e.g., execution, market, risk, settings, strategy)
2. Update shared layout/components:
    - `apps/dashboard/src/app/layout.tsx`
    - `apps/dashboard/src/components/layout/Sidebar.tsx`
    - `apps/dashboard/src/components/layout/Footer.tsx`
3. Update or add API integration files:
    - `apps/dashboard/src/lib/hummingbot-api.ts`
    - `apps/dashboard/src/lib/hummingbot-format.ts`
4. Edit global styles:
    - `apps/dashboard/src/styles/globals.css`
5. Update deployment workflows if needed:
    - `.github/workflows/deploy-static.yml`
    - `.github/workflows/deploy-web.yml`
6. Update pre-push hooks as necessary:
    - `.husky/pre-push`
7. Commit all related changes together.

**Example:**
```typescript
// apps/dashboard/src/app/market/page.tsx
import { fetchMarketData } from '@/lib/hummingbot-api';

export default function MarketPage() {
  // ...
}
```

---

### package-release-cycle

**Trigger:** When releasing a new version of a package, updating changelogs, documentation, and configuration.  
**Command:** `/release-package`

**Steps:**
1. Update `CHANGELOG.md` with release notes.
2. Update `README.md` and/or `USAGE.md` with new usage information.
3. Bump the version in `package.json`.
4. Update or add release/config files (e.g., `versioning.config.json`, `update-release.patch`).
5. Add or update tests as needed (e.g., `src/__tests__/*.ts`).
6. Commit all changes together with a conventional commit message.

**Example Commit:**
```
chore: release version 1.2.0 with new auth features
```

---

## Testing Patterns

- **Framework:** Jest
- **Test File Pattern:** `*.test.ts`
- **Location:** Typically alongside source files or in `__tests__` directories.

**Example:**
```typescript
// packages/versioning/src/__tests__/bumpVersion.test.ts
import bumpVersion from '../bumpVersion';

test('increments patch version', () => {
  expect(bumpVersion('1.0.0', 'patch')).toBe('1.0.1');
});
```

---

## Commands

| Command             | Purpose                                                         |
|---------------------|-----------------------------------------------------------------|
| /add-ecc-bundle     | Add or update an ECC bundle (skills, agents, config, instincts) |
| /dashboard-feature  | Add or update dashboard features/pages/components                |
| /release-package    | Release a new package version and update documentation          |

---
```