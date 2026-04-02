## [1.5.2](https://github.com/edcalderon/my-second-brain/compare/v1.5.1...v1.5.2) (2026-04-02)


### Bug Fixes

* **auth:** add Supabase SQL templates ([274db4f](https://github.com/edcalderon/my-second-brain/commit/274db4fb81682a654dd4ef1d0aeb3653b3e780e7))
* **auth:** correct repository link and bump to v1.0.1 ([280f2d2](https://github.com/edcalderon/my-second-brain/commit/280f2d2f6f99f12199a986adfff4cb5843cc0411))
* **auth:** update lockfile after react-native peer bump and publish v1.1.1 ([8d95c64](https://github.com/edcalderon/my-second-brain/commit/8d95c6473d6bdf12c58c27f8175c5bf15ca42637))
* **auth:** update repository link to direct tree URL, bump to v1.0.2 ([85e2e0c](https://github.com/edcalderon/my-second-brain/commit/85e2e0c5603fae9d863e8cfe0bbb03b94e4f7a31))
* **ci:** use --frozen-lockfile to resolve @ed/auth workspace link from lockfile; remove packages/auth from monorepo versioning scope ([99e38c0](https://github.com/edcalderon/my-second-brain/commit/99e38c03abf6fa4c3ead41b0ad34840ef859a5e0))
* **deps:** sync pnpm lockfile handlebars override ([c472dd7](https://github.com/edcalderon/my-second-brain/commit/c472dd73216163fededea0fc54f5a89898d1c09a))
* **env:** point dashboard at api.a-quant.xyz ([24fc272](https://github.com/edcalderon/my-second-brain/commit/24fc272e6973bf000460b1169f54a0c5a325286e))
* **release:** skip re-tagging on plain release command since tag exists from patch ([e1212e1](https://github.com/edcalderon/my-second-brain/commit/e1212e1fc141b3146e04220aa785565a51b88ae4))
* remove conflicting minimatch override from pnpm config ([48827bc](https://github.com/edcalderon/my-second-brain/commit/48827bc98ce2370c09ac5db8c9fb1f05011c254f))
* restore workspace:* for @ed/auth, disable syncDependencies to prevent overwrite on release ([e941714](https://github.com/edcalderon/my-second-brain/commit/e941714c52a3dcecc677919df4d0068245d67a41))
* **secrets-check:** add regex char-class allowlist entries and update README/CHANGELOG for v1.5.6 ([c421bfc](https://github.com/edcalderon/my-second-brain/commit/c421bfc18a7dcb69fdd2137913f9477d1bb1d8a6))
* **site:** split project portals ([7d45886](https://github.com/edcalderon/my-second-brain/commit/7d458867f70bc7e48fed50eb831c7fd60a9288cf))
* **trading:** use api.a-quant.xyz ([7e562e9](https://github.com/edcalderon/my-second-brain/commit/7e562e97174c7aafccc216e3187fd547307963e9))
* **versioning:** execute postChangelog hook in release manager and run update-readme ([219e62e](https://github.com/edcalderon/my-second-brain/commit/219e62eb86b234eabf0ab7b306e10b864e2f0f51))
* **versioning:** guard against blank changelog sections in readme-maintainer ([1570811](https://github.com/edcalderon/my-second-brain/commit/1570811e4890ee4b376bb7fcae4d7ca065c2bde5))
* **versioning:** isolate changelog generation to package path and fix tag prefix ([8b94673](https://github.com/edcalderon/my-second-brain/commit/8b946736bfda7a98a83cfbe0eb05d6d8650ed57c))


### Features

* add my-second-brain ECC bundle (.agents/skills/my-second-brain/agents/openai.yaml) ([9fb029f](https://github.com/edcalderon/my-second-brain/commit/9fb029ff3c3fe01b30efd66888f5d1ab8e2c351a))
* add my-second-brain ECC bundle (.agents/skills/my-second-brain/agents/openai.yaml) ([b88652b](https://github.com/edcalderon/my-second-brain/commit/b88652b1033e5e2bf0854ee3b548d3c9bc0a090b))
* add my-second-brain ECC bundle (.agents/skills/my-second-brain/SKILL.md) ([3aa36ea](https://github.com/edcalderon/my-second-brain/commit/3aa36eaf0b7bc16b80faa8cc835f4b56e1241dc7))
* add my-second-brain ECC bundle (.agents/skills/my-second-brain/SKILL.md) ([6fb5405](https://github.com/edcalderon/my-second-brain/commit/6fb5405a9981a63341af7baf3100e96b2f4656a1))
* add my-second-brain ECC bundle (.agents/skills/my-second-brain/SKILL.md) ([c2bad0e](https://github.com/edcalderon/my-second-brain/commit/c2bad0e2de30a2804e72f98e71195da6d771f555))
* add my-second-brain ECC bundle (.claude/commands/database-migration.md) ([797fa9f](https://github.com/edcalderon/my-second-brain/commit/797fa9f3fd19754e400c6bd9ff469f62c55f5738))
* add my-second-brain ECC bundle (.claude/commands/database-migration.md) ([abafca5](https://github.com/edcalderon/my-second-brain/commit/abafca50f39ab95b0b6fd9289f3116e50ad96cab))
* add my-second-brain ECC bundle (.claude/commands/database-migration.md) ([a4faccb](https://github.com/edcalderon/my-second-brain/commit/a4faccbccd82f98a74a14467514215c3ac17cb98))
* add my-second-brain ECC bundle (.claude/commands/ecc-bundle-addition.md) ([1954a7e](https://github.com/edcalderon/my-second-brain/commit/1954a7eb7cea1001bd8cdb31ab393bfca315cbaa))
* add my-second-brain ECC bundle (.claude/commands/feature-development.md) ([b6793c0](https://github.com/edcalderon/my-second-brain/commit/b6793c04a64924e2248dfa4224ac19c85447204e))
* add my-second-brain ECC bundle (.claude/commands/feature-development.md) ([6b2fa95](https://github.com/edcalderon/my-second-brain/commit/6b2fa956b74c33c6dbcd768273c0596d8566e58d))
* add my-second-brain ECC bundle (.claude/commands/feature-development.md) ([56ec076](https://github.com/edcalderon/my-second-brain/commit/56ec076d4637b1950c620178e60ada179d8bd09b))
* add my-second-brain ECC bundle (.claude/commands/test-driven-development.md) ([d5c3d6a](https://github.com/edcalderon/my-second-brain/commit/d5c3d6a2041ccdf52a9e2ce48840dfb880cfb23d))
* add my-second-brain ECC bundle (.claude/commands/test-driven-development.md) ([64387c6](https://github.com/edcalderon/my-second-brain/commit/64387c62f7b71a598ce67bd340f195848abf3f89))
* add my-second-brain ECC bundle (.claude/ecc-tools.json) ([38196de](https://github.com/edcalderon/my-second-brain/commit/38196de4b78aac26c64ede17c0cd1ca974570ebb))
* add my-second-brain ECC bundle (.claude/ecc-tools.json) ([1bae9d1](https://github.com/edcalderon/my-second-brain/commit/1bae9d1473e6a3e9584b3f63065a8ccfd158e762))
* add my-second-brain ECC bundle (.claude/ecc-tools.json) ([ae66596](https://github.com/edcalderon/my-second-brain/commit/ae665965100c84f935c8597237b966ebf6c0f648))
* add my-second-brain ECC bundle (.claude/homunculus/instincts/inherited/my-second-brain-instincts.yaml) ([c1f04b2](https://github.com/edcalderon/my-second-brain/commit/c1f04b2f316e31e0d382f692d9857853b04dbe09))
* add my-second-brain ECC bundle (.claude/homunculus/instincts/inherited/my-second-brain-instincts.yaml) ([477149d](https://github.com/edcalderon/my-second-brain/commit/477149d6f027b589211cec10192400086ce765b7))
* add my-second-brain ECC bundle (.claude/identity.json) ([224b06a](https://github.com/edcalderon/my-second-brain/commit/224b06a32b81acfc9f61ab29e6acb4b4ad9ce709))
* add my-second-brain ECC bundle (.claude/identity.json) ([175699b](https://github.com/edcalderon/my-second-brain/commit/175699b4ccd13839a5fc737a17ffbc929f3d302f))
* add my-second-brain ECC bundle (.claude/identity.json) ([8aff879](https://github.com/edcalderon/my-second-brain/commit/8aff879252e0326b7851ccc380886089a120a9b2))
* add my-second-brain ECC bundle (.claude/skills/my-second-brain/SKILL.md) ([6e8d036](https://github.com/edcalderon/my-second-brain/commit/6e8d0364c448d35eaa8c7eb1a3b82c3b710be504))
* add my-second-brain ECC bundle (.claude/skills/my-second-brain/SKILL.md) ([abddaa4](https://github.com/edcalderon/my-second-brain/commit/abddaa46e4aab9d174405efb71b749f43154d68f))
* add my-second-brain ECC bundle (.claude/skills/my-second-brain/SKILL.md) ([c972a99](https://github.com/edcalderon/my-second-brain/commit/c972a990d0d4a5d1b4603c749c03c64ae5b8d246))
* add my-second-brain ECC bundle (.codex/AGENTS.md) ([3d49c78](https://github.com/edcalderon/my-second-brain/commit/3d49c7882d5256d382810ebabb322ff89f67b817))
* add my-second-brain ECC bundle (.codex/AGENTS.md) ([9272364](https://github.com/edcalderon/my-second-brain/commit/927236483c8b1cd6933c10d19ea8d2674288026c))
* add my-second-brain ECC bundle (.codex/agents/docs-researcher.toml) ([018894b](https://github.com/edcalderon/my-second-brain/commit/018894b63560f9365dbc9595d582ff2457ca60ac))
* add my-second-brain ECC bundle (.codex/agents/docs-researcher.toml) ([199b604](https://github.com/edcalderon/my-second-brain/commit/199b604a5c47b73e9fd43cbbfd8e2b769e5acdac))
* add my-second-brain ECC bundle (.codex/agents/explorer.toml) ([b6f2d8e](https://github.com/edcalderon/my-second-brain/commit/b6f2d8e2943b86fe80ed3e4245abf1e9362708d3))
* add my-second-brain ECC bundle (.codex/agents/explorer.toml) ([1c3d4fc](https://github.com/edcalderon/my-second-brain/commit/1c3d4fcb4335c7a915b0d4f87faf6ab67c09a22b))
* add my-second-brain ECC bundle (.codex/agents/reviewer.toml) ([6b5192e](https://github.com/edcalderon/my-second-brain/commit/6b5192e71b7a8254a6cff08cb1a42df24b633953))
* add my-second-brain ECC bundle (.codex/agents/reviewer.toml) ([a6f3dfa](https://github.com/edcalderon/my-second-brain/commit/a6f3dfa861765fb6fec8fa0e6d4d0b313ed0bc9e))
* add my-second-brain ECC bundle (.codex/config.toml) ([6a71888](https://github.com/edcalderon/my-second-brain/commit/6a71888cae35628f5145332bfebb4f6e1b01e25b))
* add my-second-brain ECC bundle (.codex/config.toml) ([346d64d](https://github.com/edcalderon/my-second-brain/commit/346d64d5bb724274bb2c6cc7b45559033b7dfe52))
* **auth:** add authentik preset helpers ([e730390](https://github.com/edcalderon/my-second-brain/commit/e730390812980a1cc5ddcbcc76c06fa964cf5887))
* **auth:** add canonical Authentik OIDC client helpers ([64fb5c6](https://github.com/edcalderon/my-second-brain/commit/64fb5c6a377614fd820cabaf46ac2aeaa476a5e4)), closes [#13](https://github.com/edcalderon/my-second-brain/issues/13)
* **auth:** add Web3 authentication support (SIWE/SIWS) v1.2.0 ([f585d46](https://github.com/edcalderon/my-second-brain/commit/f585d465d9ee8a7653b098ac550a780e94fc1c2d))
* **auth:** Authentik flow + provisioning kit ([#17](https://github.com/edcalderon/my-second-brain/issues/17)) ([4ff3cef](https://github.com/edcalderon/my-second-brain/commit/4ff3cefb6c6b13ae2fd4b272e6a0a3a639c48a72)), closes [#16](https://github.com/edcalderon/my-second-brain/issues/16)
* **auth:** prepare @edcalderon/auth for NPM publishing ([ba57163](https://github.com/edcalderon/my-second-brain/commit/ba5716360d6c454286d9a349bcaf7f762f60fd6d))
* **auth:** Upgrade to fully universal compatibility (Web, Next, React Native) ([5c8aade](https://github.com/edcalderon/my-second-brain/commit/5c8aade273f021e56b19f75bec1ac17e6683e301))
* release edward site and gcp functions ([8d61ce5](https://github.com/edcalderon/my-second-brain/commit/8d61ce51e33c585dc88e5ea0aa808e3f5b3a3bc2))
* split project portals and wire a-quant ([c5ba9a1](https://github.com/edcalderon/my-second-brain/commit/c5ba9a1cf56f837e5f5d829b744f6405bde4f688))
* **versioning:** add workspace env extension ([c3c7131](https://github.com/edcalderon/my-second-brain/commit/c3c71315aabe8cb266a0a1b59a2194169471d19f))
* **versioning:** release 1.5.8 ([10897d0](https://github.com/edcalderon/my-second-brain/commit/10897d0f41f5fefa53c9c451b0958e8818d6dccb))
* **versioning:** release 1.5.9 ([6c369d0](https://github.com/edcalderon/my-second-brain/commit/6c369d0a7045308f3e3c294e6ef89e0d3a66e290))
* **versioning:** workspace-scripts extension v1.0.0 — auto-generate dev:all, build:all, per-app scripts ([adb586c](https://github.com/edcalderon/my-second-brain/commit/adb586cc7021fd6b554fe62884a3dc9d24b8c311))









## [1.5.1](https://github.com/edcalderon/my-second-brain/compare/v1.5.0...v1.5.1) (2026-02-28)


### Bug Fixes

* **auth:** align package versioning natively through workspace references and remove residual supabase manual endpoints ([5e6065d](https://github.com/edcalderon/my-second-brain/commit/5e6065d8e240eae9e82d06d77d25f73bfc243cb3))
* **ci:** add Supabase env vars and version overrides to GitHub Pages workflow ([3ef8fe1](https://github.com/edcalderon/my-second-brain/commit/3ef8fe1f7546656276f0a3d23c22ace6d5f88e69))
* **ci:** align Firebase secret names to match actual GitHub secrets (NEXT_PUBLIC_ prefix) ([354f0f7](https://github.com/edcalderon/my-second-brain/commit/354f0f7489c72bb1ae597f9a19a396f78d58a605))
* **ci:** guard supabase init, add missing env secrets to workflow, fix a-quant version fallback ([8c8fb1a](https://github.com/edcalderon/my-second-brain/commit/8c8fb1a2834f35e1119c2b955a567fc8fdd568a9))
* correct /documents→/documentation link, improve analytics dark mode contrast ([bd28d32](https://github.com/edcalderon/my-second-brain/commit/bd28d3214a810f30e993cfab6e98eb5dba569473))
* update email placeholder domain from a-quant.ai to a-quant.xyz ([90e19da](https://github.com/edcalderon/my-second-brain/commit/90e19da6a335f2208e82f4289a41e1ba11b404b2))







# [1.5.0](https://github.com/edcalderon/my-second-brain/compare/v1.4.3...v1.5.0) (2026-02-27)





## [1.1.5](https://github.com/edcalderon/my-second-brain/compare/v1.1.4...v1.1.5) (2026-02-12)


### Bug Fixes

* add force-static export to API routes for static export compatibility ([6333e2d](https://github.com/edcalderon/my-second-brain/commit/6333e2d2b3ae149b5b893520271e7a0e171bace8))
* add search method to supermemory wrapper ([75f646a](https://github.com/edcalderon/my-second-brain/commit/75f646a377ee96a2ef66e9225b003ef19e25277e))
* change Next.js output to export for static GitHub Pages deployment ([c94fded](https://github.com/edcalderon/my-second-brain/commit/c94fdedda9b311b1aae27ddce4b2c9bb6083b325))
* lazy-load supermemory to allow builds without API key ([6892009](https://github.com/edcalderon/my-second-brain/commit/68920097e9aeabe76d8a08e45d96837ba009f32d))
* make environment variable check optional in deploy-web workflow ([e6cb9b0](https://github.com/edcalderon/my-second-brain/commit/e6cb9b0873fc9244fbc104f2bb832056e1ffd44c))
* pin pnpm version to 8.15.9 in GitHub Actions workflows for lockfile compatibility ([3a8538e](https://github.com/edcalderon/my-second-brain/commit/3a8538e3e2f84f21b4ad98d2c878eac8e6c065f7))
* relax pnpm version requirement to >=8.0.0 for CI compatibility ([9aa90ac](https://github.com/edcalderon/my-second-brain/commit/9aa90acc92b62debd0e0e840a493d30e71821b38))


### Features

* **gcp-functions:** Implement automated GitHub daily screenshot and tweet ([b3366d4](https://github.com/edcalderon/my-second-brain/commit/b3366d4a13858ae2702f9f4cd16216a41f650a83))
* **versioning:** reentry status roadmap layer (v1.1.0) ([f6e94e5](https://github.com/edcalderon/my-second-brain/commit/f6e94e5dfc1fdd386d4ae9612c083155a2c803e8))





## [1.1.4](https://github.com/edcalderon/my-second-brain/compare/v1.1.3...v1.1.4) (2026-01-04)


### Bug Fixes

* correct Docusaurus baseUrl for production deployment ([6e0252d](https://github.com/edcalderon/my-second-brain/commit/6e0252d4d12940ad2749aa3543ed1a12e5afdbba))


### Features

* implement email movement to Archives/rocketbook + clean sensitive data from docs ([6f49e29](https://github.com/edcalderon/my-second-brain/commit/6f49e291982d0f9984423f9fe54396a78e642d81))







## [1.1.3](https://github.com/edcalderon/my-second-brain/compare/v1.1.2...v1.1.3) (2026-01-02)





## [1.1.2](https://github.com/edcalderon/my-second-brain/compare/v1.1.1...v1.1.2) (2026-01-02)





## [1.1.1](https://github.com/edcalderon/my-second-brain/compare/v1.1.0...v1.1.1) (2026-01-02)





# [1.1.0](https://github.com/edcalderon/my-second-brain/compare/v1.0.3...v1.1.0) (2026-01-02)


### Features

* integrate Docusaurus documentation app ([371f336](https://github.com/edcalderon/my-second-brain/commit/371f3368b16838502a5cd9c2b75b195c1ea37df1))





## [1.0.3](https://github.com/edcalderon/my-second-brain/compare/v1.0.10...v1.0.3) (2026-01-02)


### Features

* integrate @edcalderon/versioning for monorepo management ([761f9a6](https://github.com/edcalderon/my-second-brain/commit/761f9a6648d3f98e6b51cad2d49e186a81823698))





## 1.0.2 (2026-01-01)





# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).