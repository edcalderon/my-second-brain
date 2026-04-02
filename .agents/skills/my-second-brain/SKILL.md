```markdown
# my-second-brain Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill documents the core development patterns, coding conventions, and automated workflows for the `my-second-brain` repository. The project is built with TypeScript and Next.js, featuring modular dashboard applications, versioned packages, and agent/skill bundles for Claude and Codex AI agents. The repository emphasizes maintainability, clear commit conventions, and robust automation for feature releases and deployments.

---

## Coding Conventions

### File Naming

- **CamelCase** is used for file names.
  - Example: `myComponent.tsx`, `userProfile.ts`

### Import Style

- **Alias imports** are preferred for referencing modules.
  ```typescript
  import myUtil from '@lib/myUtil';
  import DashboardLayout from '@components/layout/DashboardLayout';
  ```

### Export Style

- **Default exports** are standard.
  ```typescript
  // Good
  export default function Dashboard() { ... }

  // Avoid
  export { Dashboard };
  ```

### Commit Messages

- **Conventional commits** with prefixes: `chore`, `feat`, `fix`, `docs`
  - Example: `feat: add multi-page dashboard support`
  - Average length: ~58 characters

---

## Workflows

### ecc-bundle-addition

**Trigger:** When adding or updating the `my-second-brain` ECC bundle or its components for Claude/Codex agents  
**Command:** `/add-ecc-bundle`

1. Add or update `SKILL.md` and agent YAML files under `.agents/skills/my-second-brain/`
2. Add or update `SKILL.md` under `.claude/skills/my-second-brain/`
3. Add or update command markdown files under `.claude/commands/` (e.g., `feature-development.md`, `test-driven-development.md`, `database-migration.md`)
4. Add or update instincts YAML under `.claude/homunculus/instincts/inherited/`
5. Update `.claude/ecc-tools.json` and `.claude/identity.json`
6. Add or update agent TOML files and `AGENTS.md` under `.codex/agents/` and `.codex/AGENTS.md`
7. Update `.codex/config.toml`

**Example:**
```bash
/add-ecc-bundle
```

---

### dashboard-multi-page-feature-release

**Trigger:** When releasing a new dashboard feature involving multiple pages or splitting/merging dashboard portals  
**Command:** `/release-dashboard-feature`

1. Add or update page components under `apps/dashboard/src/app/`
2. Update shared layout components (e.g., `Sidebar.tsx`, `Footer.tsx`, `AppShell.tsx`)
3. Update or add API/config files under `apps/dashboard/src/lib/`
4. Update public assets or HTML files under `apps/dashboard/public/`
5. Update environment files (`.env.*`) if needed
6. Update deployment workflow YAMLs if required

**Example:**
```typescript
// apps/dashboard/src/app/newFeaturePage.tsx
export default function NewFeaturePage() {
  return <div>Welcome to the new feature!</div>;
}
```
```bash
/release-dashboard-feature
```

---

### versioning-package-release

**Trigger:** When releasing a new version or patch of the versioning package  
**Command:** `/release-versioning`

1. Update `CHANGELOG.md` and `README.md` in `packages/versioning/`
2. Update `package.json` version
3. Update or add source files and tests under `packages/versioning/src/`
4. Update `versioning.config.json`
5. Optionally add or update scripts and usage docs

**Example:**
```json
// packages/versioning/package.json
{
  "version": "1.2.0"
}
```
```bash
/release-versioning
```

---

### dashboard-deployment-workflow-update

**Trigger:** When updating deployment workflows or environment settings for the dashboard  
**Command:** `/update-deployment-workflow`

1. Update `.github/workflows/deploy-static.yml` and/or `deploy-web.yml`
2. Update dashboard environment files (`apps/dashboard/.env.*`) if needed
3. Update dashboard source or config files as required

**Example:**
```yaml
# .github/workflows/deploy-static.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Dashboard
        run: npm run deploy
```
```bash
/update-deployment-workflow
```

---

## Testing Patterns

- **Framework:** Jest
- **Test file pattern:** `*.test.ts`
- **Location:** Next to source files or in dedicated `__tests__` directories

**Example:**
```typescript
// apps/dashboard/src/lib/myUtil.test.ts
import myUtil from './myUtil';

test('myUtil returns expected result', () => {
  expect(myUtil(2, 3)).toBe(5);
});
```

---

## Commands

| Command                   | Purpose                                                           |
|---------------------------|-------------------------------------------------------------------|
| /add-ecc-bundle           | Add or update the my-second-brain ECC bundle for Claude/Codex     |
| /release-dashboard-feature| Release a new multi-page dashboard feature                        |
| /release-versioning       | Release a new version of the versioning package                   |
| /update-deployment-workflow| Update dashboard deployment workflows or environment settings     |
```
