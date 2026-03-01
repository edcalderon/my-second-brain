# Changelog

## [1.0.3] - 2026-03-01

### Fixed

- 🐛 Updated import from `@ed/auth` (old internal alias) to `@edcalderon/auth` in dashboard consumer
- 📝 Added `update-readme` script — uses `versioning update-readme` to keep README in sync with CHANGELOG
- 🔄 Versioning package used as dev dependency for README maintenance

## [1.0.2] - 2026-03-01

### Fixed

- 🔗 Updated repository link to point directly to the auth package tree on GitHub

## [1.0.1] - 2026-03-01

### Fixed

- 🔗 Corrected repository URL and added `homepage` field for proper NPM package linking

## [1.0.0] - 2026-03-01

### Initial Release

- ✨ Provider-agnostic `AuthClient` interface
- 🔌 Built-in Supabase adapter (`SupabaseClient`)
- 🔌 Built-in Firebase adapter (`FirebaseClient`)
- 🔌 Hybrid adapter for Firebase→Supabase federated flows (`HybridClient`)
- ⚛️ React `AuthProvider` and `useAuth` hook
- 🛡️ Unified `User` type across all providers
- 📦 Published as `@edcalderon/auth` on NPM
