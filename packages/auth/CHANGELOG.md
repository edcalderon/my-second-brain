# Changelog

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
