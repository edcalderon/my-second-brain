#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_NPM_REGISTRY = 'https://registry.npmjs.org';

function isPublicNpmRegistry(registry) {
  const normalized = String(registry || PUBLIC_NPM_REGISTRY).replace(/\/$/, '');
  return normalized === PUBLIC_NPM_REGISTRY;
}

function isAuthorizedGitHubRelease(env, version) {
  return env.GITHUB_ACTIONS === 'true'
    && env.VERSIONING_ACTION_PUBLISH === 'true'
    && env.GITHUB_WORKFLOW === 'Publish Versioning to NPM'
    && env.GITHUB_REF === `refs/tags/versioning-v${version}`;
}

function isExplicitManualOverride(env, version) {
  return env.ALLOW_MANUAL_NPM_PUBLISH === '1'
    && env.MANUAL_PUBLISH_CONFIRM === `@edcalderon/versioning@${version}`;
}

function assertNpmPublishAuthorized(env, version) {
  if (!isPublicNpmRegistry(env.npm_config_registry)) return;
  if (isAuthorizedGitHubRelease(env, version)) return;
  if (isExplicitManualOverride(env, version)) return;

  throw new Error(
    'Publishing @edcalderon/versioning to npmjs.org is restricted to the "Publish Versioning to NPM" GitHub Actions workflow. '
      + 'Create and push a versioning-v<version> tag instead. For an explicitly approved emergency manual publish, set ALLOW_MANUAL_NPM_PUBLISH=1 and MANUAL_PUBLISH_CONFIRM=@edcalderon/versioning@<version>.'
  );
}

function main() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assertNpmPublishAuthorized(process.env, packageJson.version);
}

if (require.main === module) main();

module.exports = { assertNpmPublishAuthorized, isAuthorizedGitHubRelease, isExplicitManualOverride, isPublicNpmRegistry };
