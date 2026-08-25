#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function validateReleaseMetadata({ version, tagName, readme }) {
  const errors = [];
  const expectedTag = `versioning-v${version}`;

  if (tagName !== expectedTag) {
    errors.push(`Tag ${tagName || '(missing)'} does not match package version ${version}; expected ${expectedTag}.`);
  }

  if (!readme.includes(`## 📋 Latest Changes (v${version})`)) {
    errors.push(`README.md must include a "Latest Changes (v${version})" section before publishing.`);
  }

  return errors;
}

function main() {
  const packageDir = path.join(__dirname, '..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  const readme = fs.readFileSync(path.join(packageDir, 'README.md'), 'utf8');
  const errors = validateReleaseMetadata({
    version: packageJson.version,
    tagName: process.env.GITHUB_REF_NAME,
    readme
  });

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  console.log(`Release metadata is ready for @edcalderon/versioning@${packageJson.version}.`);
}

if (require.main === module) main();

module.exports = { validateReleaseMetadata };
