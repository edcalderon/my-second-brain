```markdown
# my-second-brain Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the core development patterns, coding conventions, and common workflows used in the `my-second-brain` monorepo. The codebase is written in TypeScript, built with Next.js, and organized into multiple packages and apps. It emphasizes clear commit messages, modular code, thorough testing, and robust documentation practices.

## Coding Conventions

**File Naming**
- Use camelCase for file and folder names.
  - Example: `userProfile.ts`, `apiRoutes/`

**Import Style**
- Use alias imports for internal modules.
  - Example:
    ```typescript
    import userService from '@services/userService';
    ```

**Export Style**
- Use default exports for modules.
  - Example:
    ```typescript
    // userProfile.ts
    const userProfile = { /* ... */ };
    export default userProfile;
    ```

**Commit Messages**
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard.
- Prefixes: `chore`, `fix`, `feat`, `docs`
- Example:
  ```
  feat(auth): add JWT token refresh endpoint
  ```

## Workflows

### Package Release Workflow
**Trigger:** When you want to publish a new version of a package (auth or versioning).
**Command:** `/release-package`

1. Update `CHANGELOG.md` in the target package with release notes.
2. Update `README.md` with new documentation or version badge.
3. Bump the version in `package.json`.
4. Optionally update or add migration/test files.
5. Commit all changes with a release message.

**Example:**
```bash
# Step 1: Edit files
vim packages/auth/CHANGELOG.md
vim packages/auth/README.md
npm version minor

# Step 2: Commit
git add .
git commit -m "chore(release): v1.2.0"
```

---

### Feature Addition with Tests and Docs
**Trigger:** When adding a new feature to a package (auth or versioning).
**Command:** `/add-feature`

1. Implement the new feature in `src/` or a subfolder.
2. Add or update tests in `src/__tests__/`.
3. Update `README.md` to document the new feature.
4. Update `CHANGELOG.md` to record the feature addition.
5. Bump the version in `package.json` if releasing.

**Example:**
```typescript
// packages/auth/src/tokenManager.ts
export default function refreshToken() { /* ... */ }
```
```typescript
// packages/auth/src/__tests__/tokenManager.test.ts
import refreshToken from '../tokenManager';
test('refreshToken works', () => { /* ... */ });
```

---

### Documentation Expansion Workflow
**Trigger:** When expanding or improving documentation for a package.
**Command:** `/add-docs`

1. Create or update markdown files in the `docs/` subfolder.
2. Update `README.md` to reference new docs.
3. Optionally update `CHANGELOG.md` to mention doc changes.

**Example:**
```bash
vim packages/auth/docs/usage.md
vim packages/auth/README.md
git commit -am "docs(auth): add usage guide"
```

---

### Readme Maintainer Sync
**Trigger:** When ensuring `README.md` is up-to-date with code or config changes.
**Command:** `/sync-readme`

1. Run or trigger the readme-maintainer tool.
2. Update `README.md` with generated or synced content.
3. Commit `README.md` with a sync message.

**Example:**
```bash
npm run readme-maintainer
git add README.md
git commit -m "chore(readme): sync with latest changes"
```

---

### Add Database Migration Workflow
**Trigger:** When adding or updating database tables or migrations.
**Command:** `/new-migration`

1. Create a new SQL migration file in the `migrations/` folder.
2. Update `README.md` or docs to describe the migration.
3. Update `CHANGELOG.md` to record the migration.

**Example:**
```sql
-- packages/auth/supabase/migrations/20240601_add_sessions.sql
ALTER TABLE sessions ADD COLUMN expires_at TIMESTAMP;
```
```bash
vim packages/auth/README.md
vim packages/auth/CHANGELOG.md
git commit -am "feat(db): add expires_at to sessions"
```

---

## Testing Patterns

- Use [Jest](https://jestjs.io/) for all tests.
- Test files follow the pattern: `*.test.ts` and are placed in `src/__tests__/`.
- Example:
  ```typescript
  // packages/auth/src/__tests__/userService.test.ts
  import userService from '../userService';

  describe('userService', () => {
    it('should create a user', () => {
      // test implementation
    });
  });
  ```

## Commands

| Command           | Purpose                                                        |
|-------------------|----------------------------------------------------------------|
| /release-package  | Release a new version of a package                             |
| /add-feature      | Add a new feature with tests and documentation                 |
| /add-docs         | Expand or update documentation                                 |
| /sync-readme      | Sync README.md with latest code or config changes              |
| /new-migration    | Add a new database migration and update related documentation  |
```