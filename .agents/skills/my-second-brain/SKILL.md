```markdown
# my-second-brain Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill documents the development patterns, coding conventions, and key workflows for the `my-second-brain` monorepo, a TypeScript project built with Next.js. The repository follows conventional commit standards, uses camelCase file naming, alias imports, and default exports. It features automated workflows for package releases, feature development, documentation sync, versioning extensions, SQL migrations, and dependency upgrades. Testing is performed using Jest with a clear file pattern.

## Coding Conventions

- **File Naming:**  
  Use camelCase for all file and folder names.  
  _Example:_  
  ```
  src/userProfile.ts
  src/auth/sessionManager.ts
  ```

- **Import Style:**  
  Use alias imports for internal modules.  
  _Example:_  
  ```typescript
  import userService from '@auth/userService'
  import { getSession } from '@auth/sessionManager'
  ```

- **Export Style:**  
  Use default exports for modules.  
  _Example:_  
  ```typescript
  // src/auth/sessionManager.ts
  const sessionManager = { /* ... */ }
  export default sessionManager
  ```

- **Commit Messages:**  
  Follow [Conventional Commits](https://www.conventionalcommits.org/) with prefixes: `chore`, `fix`, `feat`, `docs`.  
  _Example:_  
  ```
  feat(auth): add support for OAuth2 login
  fix(versioning): resolve migration file naming bug
  ```

## Workflows

### Package Release Version Bump
**Trigger:** When releasing a new version of a package (auth or versioning)  
**Command:** `/release-package`

1. Update `CHANGELOG.md` with release notes.
2. Update `README.md` if necessary.
3. Bump the version in `package.json`.
4. Optionally, update or generate release artifacts (e.g., patch or migration files).

_Files involved:_  
- `packages/*/CHANGELOG.md`  
- `packages/*/README.md`  
- `packages/*/package.json`

---

### Feature Development in Auth Package
**Trigger:** When adding a new feature to the auth package  
**Command:** `/add-auth-feature`

1. Implement the feature in `packages/auth/src/` or its subfolders.
2. Add or update tests in `packages/auth/src/__tests__/`.
3. Update `CHANGELOG.md` with feature details.
4. Update `README.md` with usage or documentation.
5. Bump the version in `package.json`.

_Files involved:_  
- `packages/auth/src/**/*.ts`  
- `packages/auth/src/__tests__/*.ts`  
- `packages/auth/CHANGELOG.md`  
- `packages/auth/README.md`  
- `packages/auth/package.json`

---

### Documentation Sync (readme-maintainer)
**Trigger:** When synchronizing documentation after changes or releases  
**Command:** `/sync-readme`

1. Run `readme-maintainer` or a similar tool.
2. Update the relevant `README.md` file(s).

_Files involved:_  
- `packages/auth/README.md`  
- `packages/versioning/README.md`  
- `apps/dashboard/README.md`

---

### Add or Update Versioning Extension
**Trigger:** When adding or enhancing a versioning extension  
**Command:** `/add-versioning-extension`

1. Implement or update the extension in `packages/versioning/src/extensions/`.
2. Add or update tests in `packages/versioning/src/__tests__/`.
3. Update `CHANGELOG.md` and `README.md`.
4. Update `package.json` and `versioning.config.json` if needed.

_Files involved:_  
- `packages/versioning/src/extensions/**/index.ts`  
- `packages/versioning/src/__tests__/*.ts`  
- `packages/versioning/CHANGELOG.md`  
- `packages/versioning/README.md`  
- `packages/versioning/package.json`  
- `packages/versioning/versioning.config.json`

---

### Add SQL Migration to Auth Supabase
**Trigger:** When updating the auth database schema or sync logic  
**Command:** `/add-auth-migration`

1. Create a new SQL migration file in `supabase/migrations/`.
2. Update or add documentation in `supabase/README.md` or the main `README.md`.
3. Update `CHANGELOG.md`.
4. Bump the version in `package.json`.

_Files involved:_  
- `packages/auth/supabase/migrations/*.sql`  
- `packages/auth/supabase/README.md`  
- `packages/auth/README.md`  
- `packages/auth/CHANGELOG.md`  
- `packages/auth/package.json`

---

### Dependency Upgrade and Security Harden
**Trigger:** When addressing CVEs or upgrading dependencies for compatibility  
**Command:** `/upgrade-dependencies`

1. Update dependencies in all relevant `package.json` files.
2. Update lockfiles (`pnpm-lock.yaml`, `package-lock.json`).
3. Update override sections if needed.
4. Document changes in relevant markdown files.

_Files involved:_  
- `package.json`  
- `pnpm-lock.yaml`  
- `packages/*/package.json`  
- `packages/*/package-lock.json`  
- `docs/*.md`

---

## Testing Patterns

- **Framework:** Jest
- **Test File Pattern:**  
  All test files use the `*.test.ts` suffix and are typically placed alongside or within a `__tests__` directory.

_Example:_  
```
packages/auth/src/__tests__/sessionManager.test.ts
```

_Basic test example:_  
```typescript
import sessionManager from '../sessionManager'

describe('sessionManager', () => {
  it('should create a session', () => {
    const session = sessionManager.create('user123')
    expect(session.userId).toBe('user123')
  })
})
```

## Commands

| Command                   | Purpose                                                        |
|---------------------------|----------------------------------------------------------------|
| /release-package          | Release a new version of a package                             |
| /add-auth-feature         | Add a new feature to the auth package                          |
| /sync-readme              | Synchronize README documentation across packages and apps      |
| /add-versioning-extension | Add or update a versioning extension                          |
| /add-auth-migration       | Add a new SQL migration for auth Supabase integration          |
| /upgrade-dependencies     | Upgrade dependencies and address security vulnerabilities      |
```
