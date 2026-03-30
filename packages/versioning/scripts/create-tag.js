#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = loadJson(packageJsonPath);
  return packageJson.version;
}

function loadVersioningConfig() {
  const configPath = path.join(__dirname, '..', 'versioning.config.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }

  return loadJson(configPath);
}

function resolveTagPrefix(config) {
  return config?.releaseGuard?.tagPrefix || 'versioning-v';
}

async function createVersionTag() {
  try {
    const version = getCurrentVersion();
    const config = loadVersioningConfig();
    const tagPrefix = resolveTagPrefix(config);
    const fullTag = `${tagPrefix}${version}`;
    const { runReleaseGuard } = require('../dist/release-guard');

    await runReleaseGuard(
      {
        rootPackageJson: 'package.json',
        packages: config.packages || [],
        releaseGuard: {
          enabled: true,
          tagPrefix,
          allowBuildMetadata: config?.releaseGuard?.allowBuildMetadata ?? true,
          checkReleaseFloor: config?.releaseGuard?.checkReleaseFloor ?? true,
          metadataFiles: config?.releaseGuard?.metadataFiles || []
        }
      },
      {
        tag: fullTag,
        tagPrefix,
        packages: config.packages || [],
        metadataFiles: config?.releaseGuard?.metadataFiles || [],
        allowBuildMetadata: config?.releaseGuard?.allowBuildMetadata ?? true,
        checkReleaseFloor: config?.releaseGuard?.checkReleaseFloor ?? true
      }
    );

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