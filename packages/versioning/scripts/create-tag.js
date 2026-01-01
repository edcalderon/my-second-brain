#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createVersionTag() {
  try {
    // Get current version from package.json (go up two directories from scripts/)
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;

    // Use versioning prefix to avoid conflicts with monorepo tags
    const tagPrefix = 'versioning-v';
    const fullTag = `${tagPrefix}${version}`;

    // Check if tag already exists
    try {
      execSync(`git tag -l "${fullTag}"`, { stdio: 'pipe' });
      console.log(`Tag ${fullTag} already exists`);
      return;
    } catch (error) {
      // Tag doesn't exist, continue
    }

    // Create annotated tag
    const tagMessage = `Release @ed/versioning v${version}`;
    execSync(`git tag -a "${fullTag}" -m "${tagMessage}"`, { stdio: 'inherit' });

    console.log(`Created tag ${fullTag}`);

    // Push tag
    execSync('git push origin --tags', { stdio: 'inherit' });

    console.log(`Pushed tag ${fullTag} to remote`);
    console.log(`\n🚀 Tag ${fullTag} created and pushed!`);
    console.log(`The NPM publish workflow will now run automatically.`);

  } catch (error) {
    console.error('Error creating version tag:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createVersionTag();
}