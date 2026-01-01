#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Use the built versioning tool to get the current version
async function getCurrentVersion() {
  try {
    const { VersionManager } = require('../dist/versioning');
    const versionManager = new VersionManager();
    return await versionManager.getCurrentVersion();
  } catch (error) {
    // Fallback to reading package.json directly
    const fs = require('fs');
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  }
}

async function createVersionTag() {
  try {
    // Get current version using the versioning tool
    const version = await getCurrentVersion();

    // Use versioning prefix to avoid conflicts with monorepo tags
    const tagPrefix = 'versioning-v';
    const fullTag = `${tagPrefix}${version}`;

    console.log(`📦 Current version: ${version}`);
    console.log(`🏷️  Creating tag: ${fullTag}`);

    // Check if tag already exists
    try {
      const result = execSync(`git tag -l "${fullTag}"`, { stdio: 'pipe' });
      const output = result.toString().trim();
      if (output === fullTag) {
        console.log(`⚠️  Tag ${fullTag} already exists`);
        return;
      }
    } catch (error) {
      // Tag doesn't exist, continue
    }

    // Create annotated tag
    const tagMessage = `Release @edcalderon/versioning v${version}`;
    execSync(`git tag -a "${fullTag}" -m "${tagMessage}"`, { stdio: 'inherit' });

    console.log(`✅ Created tag ${fullTag}`);

    // Push tag
    execSync('git push origin --tags', { stdio: 'inherit' });

    console.log(`🚀 Pushed tag ${fullTag} to remote`);
    console.log(`\n🎉 Tag ${fullTag} created and pushed!`);
    console.log(`The NPM publish workflow will now run automatically.`);

  } catch (error) {
    console.error('❌ Error creating version tag:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createVersionTag();
}