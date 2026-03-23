# Changelog

## [1.4.0] - 2026-03-23

### Added

- ✨ **Authentik flow + provisioning kit** (`@edcalderon/auth/authentik`) — a reusable set of helpers generalised from the production CIG Authentik implementation.
- 🔀 **Cross-origin PKCE relay** — `createRelayPageHtml()`, `parseRelayParams()`, `readRelayStorage()`, `clearRelayStorage()` for apps where login UI and callback handler live on different origins.
- 🔄 **Enhanced callback handler** — `exchangeCode()`, `fetchClaims()`, `processCallback()` with blocking provisioning gate that prevents redirect until user sync completes.
- 🚪 **Logout orchestrator** — `revokeToken()`, `buildEndSessionUrl()`, `orchestrateLogout()` implementing the full RP-initiated logout flow.
- 🔌 **Provisioning adapter layer** — pluggable adapters: `NoopProvisioningAdapter`, `createProvisioningAdapter()`, `SupabaseSyncAdapter` with identity-first matching and rollback on failure.
- 🏥 **Config validation / doctor** — `validateAuthentikConfig()`, `validateSupabaseSyncConfig()`, `validateFullConfig()` for startup / deploy-time validation (detects `supabase_not_configured`).
- 🛡️ **Safe redirect resolver** — `resolveSafeRedirect()` with origin allowlist to prevent open-redirect vulnerabilities.
- 📦 **New subpath export** — `@edcalderon/auth/authentik` barrel export for all Authentik-specific modules.
- 🗄️ **SQL migration 003** — `003_authentik_shadow_auth_users.sql` adds shadow auth user linkage columns and `link_shadow_auth_user()` RPC.
- 🧪 **79 tests** across 6 test suites covering relay, callback, logout, provisioning, config validation, and redirect safety.

## [1.3.0] - 2026-03-19

### Added

- Added canonical `AuthentikOidcClient` browser helpers with PKCE-only OAuth flow utilities (`isAuthentikConfigured`, `startAuthentikOAuthFlow`, `handleAuthentikCallback`, `readOidcSession`, `clearOidcSession`, `hasPendingAuthentikCallback`, `OIDC_INITIAL_SEARCH`).
- Added exported Authentik OIDC types: `OidcClaims`, `OidcSession`, `OidcProvider`.
- Added README guidance for Authentik setup and the known Authentik `2026.2.1` social re-link bug workaround.

## [1.2.2] - 2026-03-19

### Added

- Added `packages/auth/supabase/` SQL templates for a vendor-independent `public.users` table and optional Supabase Auth sync trigger.

### Fixed

- Hardened the OIDC upsert migration so identity writes require a trusted server-side caller instead of the `anon` role.
- Preserved existing user profile fields when optional claims are omitted during upserts or Supabase sync updates.

## [1.2.1] - 2026-03-02

### Changed

- 🎨 Upgraded README badges and title to `for-the-badge` style with gold (#C8A84E) / dark (#0d1117) Alternun brand colors
- 🔗 Added Web3 SIWE|SIWS badge linking to Supabase docs

## [1.2.0] - 2026-03-02

### Added

- 🔗 Added agnostic Web3 support to the core `SignInOptions` (`options.provider === 'web3'`).
- 🔗 Upgraded `SupabaseClient` and `HybridClient` adapters to natively call Supabase's `signInWithWeb3` standard.
- 📝 Documented Wagmi and `@solana/wallet-adapter` implementation examples in README.

## [1.1.3] - 2026-03-02

### Docs

- 📝 Fully rewrote README to document the new `v1.1.0` Universal Compatibility (Web + Next.js + React Native/Expo) APIs and export paths.

## [1.1.2] - 2026-03-02

### Changed

- 🧪 Test release to verify readme-maintainer guard via pre-push hook

## [1.1.1] - 2026-03-02

### Fixed

- 🐛 Updated lockfile with missing `react-native` peerDependency for CI/CD compatibility

## [1.1.0] - 2026-03-02

### Added

- ✨ Fully portable runtime compatibility between Web, Next.js, and React Native/Expo.
- 🔌 Separated package sub-exports for native implementations avoiding global window dependencies.
- 🛡️ New `SignInOptions` API and unified data shape.

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
