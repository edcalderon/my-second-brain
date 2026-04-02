```markdown
# my-second-brain Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill documents the development conventions and workflows for the `my-second-brain` monorepo, a TypeScript project built on Next.js. The repository is organized into packages, each with its own source, documentation, and changelog files. Development emphasizes clear commit messages, modular code, comprehensive testing, and well-maintained documentation. The workflows described here streamline feature development, releases, documentation, extension modules, and database migrations.

## Coding Conventions

- **File Naming:** Use `camelCase` for file and directory names.
  - Example: `userProfile.ts`, `dataFetcher/index.ts`
- **Import Style:** Use path aliases for imports.
  - Example:
    ```typescript
    import userService from '@services/userService';
    ```
- **Export Style:** Default exports are preferred.
  - Example:
    ```typescript
    // userProfile.ts
    const userProfile = { /* ... */ };
    export default userProfile;
    ```
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) with these prefixes: `chore`, `fix`, `feat`, `docs`.
  - Example: `feat(auth): add OAuth2 support to login flow`

## Workflows

### Package Release Version Bump
**Trigger:** When you want to publish a new version of a package (e.g., after new features or fixes).  
**Command:** `/release-package`

1. Update `CHANGELOG.md` with release notes:
    ```markdown
    ## 1.2.0
    - Added OAuth2 support to login flow
    - Fixed session expiration bug
    ```
2. Update `README.md` as needed to reflect new changes.
3. Update the `version` field in `package.json`.
4. Commit changes with a release message:
    ```
    chore(release): bump version to 1.2.0
    ```

**Files involved:**
- `packages/*/CHANGELOG.md`
- `packages/*/README.md`
- `packages/*/package.json`

---

### Feature Development with Tests and Docs
**Trigger:** When adding a new feature to an existing package.  
**Command:** `/new-feature`

1. Implement the new feature in the relevant source files:
    ```typescript
    // packages/user/src/userProfile.ts
    export default function getUserProfile(id: string) { /* ... */ }
    ```
2. Add or update tests in the `__tests__` directory:
    ```typescript
    // packages/user/src/__tests__/userProfile.test.ts
    import getUserProfile from '../userProfile';
    test('fetches user profile', () => { /* ... */ });
    ```
3. Update `README.md` with usage or documentation for the new feature.
4. Update `CHANGELOG.md` with a summary of the feature.
5. If necessary, update `package.json` for a version bump.

**Files involved:**
- `packages/*/src/**/*.ts`
- `packages/*/src/__tests__/**/*.test.ts`
- `packages/*/README.md`
- `packages/*/CHANGELOG.md`
- `packages/*/package.json`

---

### Documentation Expansion or Sync
**Trigger:** When improving or adding documentation for a package or app.  
**Command:** `/add-docs`

1. Add new markdown files under `docs/` or `packages/*/docs/`.
2. Update `README.md` to reference or summarize new documentation.
3. Optionally, update `CHANGELOG.md` to note documentation changes.

**Files involved:**
- `docs/**/*.md`
- `packages/*/docs/**/*.md`
- `packages/*/README.md`

---

### Add or Update Extension Module
**Trigger:** When introducing or enhancing an extension in the versioning system.  
**Command:** `/new-extension`

1. Implement or update extension code under `src/extensions/`:
    ```typescript
    // packages/versioning/src/extensions/myExtension/index.ts
    export default function myExtension() { /* ... */ }
    ```
2. Add or update tests for the extension:
    ```typescript
    // packages/versioning/src/__tests__/myExtension-extension.test.ts
    import myExtension from '../extensions/myExtension';
    test('myExtension works', () => { /* ... */ });
    ```
3. Update the extension-specific `CHANGELOG.md`.
4. Update the main package `CHANGELOG.md` and `README.md`.

**Files involved:**
- `packages/versioning/src/extensions/*/index.ts`
- `packages/versioning/src/extensions/*/CHANGELOG.md`
- `packages/versioning/src/__tests__/*-extension.test.ts`
- `packages/versioning/CHANGELOG.md`
- `packages/versioning/README.md`

---

### Add SQL Migration to Auth Package
**Trigger:** When updating the database schema for authentication features.  
**Command:** `/new-auth-migration`

1. Add a new SQL migration file under `supabase/migrations/`:
    ```
    packages/auth/supabase/migrations/20240615_add_user_roles.sql
    ```
2. Update `README.md` and/or docs with migration details.
3. Update `CHANGELOG.md` to record the migration.

**Files involved:**
- `packages/auth/supabase/migrations/*.sql`
- `packages/auth/README.md`
- `packages/auth/CHANGELOG.md`

## Testing Patterns

- **Framework:** [Jest](https://jestjs.io/)
- **Test File Pattern:** Files end with `.test.ts` and are placed in `__tests__` directories within each package's `src/`.
    - Example: `packages/user/src/__tests__/userProfile.test.ts`
- **Test Example:**
    ```typescript
    import getUserProfile from '../userProfile';

    describe('getUserProfile', () => {
      it('returns user data for valid ID', () => {
        expect(getUserProfile('123')).toEqual({ id: '123', name: 'Alice' });
      });
    });
    ```

## Commands

| Command             | Purpose                                                    |
|---------------------|------------------------------------------------------------|
| /release-package    | Release a new version of a package                         |
| /new-feature        | Add a new feature with tests and documentation             |
| /add-docs           | Expand or synchronize documentation                        |
| /new-extension      | Add or update an extension module in the versioning system |
| /new-auth-migration | Add a new SQL migration to the auth package                |
```