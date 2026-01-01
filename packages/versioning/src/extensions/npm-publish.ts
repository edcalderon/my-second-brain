import { Command } from 'commander';
import { VersioningExtension } from '../extensions';
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

const extension: VersioningExtension = {
  name: 'npm-publish',
  description: 'Extension for NPM publishing with custom logic',
  version: '1.0.0',

  register: async (program: Command, config: any) => {
    // Add publish command
    program
      .command('publish-package')
      .description('Publish package to NPM with custom logic')
      .option('-t, --tag <tag>', 'NPM dist tag', 'latest')
      .option('-d, --dry-run', 'Dry run mode', false)
      .option('--otp <code>', 'NPM 2FA code')
      .action(async (options) => {
        try {
          await publishToNPM(options);
        } catch (error) {
          console.error('❌ Publish failed:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });

    // Add local publish command for development
    program
      .command('publish-local')
      .description('Publish to local NPM registry for testing')
      .option('-r, --registry <url>', 'Local registry URL', 'http://localhost:4873')
      .action(async (options) => {
        try {
          await publishToLocalRegistry(options);
        } catch (error) {
          console.error('❌ Local publish failed:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });
  },

  hooks: {
    postVersion: async (type: string, version: string, options: any) => {
      console.log(`📦 Version bumped to ${version}, ready for publishing`);
    },

    postRelease: async (version: string, options: any) => {
      console.log(`🚀 Release ${version} completed, triggering automated publish...`);

      // Auto-publish if configured
      if (process.env.CI && process.env.NPM_TOKEN) {
        console.log('🤖 Running in CI with NPM_TOKEN, auto-publishing...');
        try {
          await publishToNPM({
            tag: 'latest',
            otp: process.env.NPM_OTP
          });
        } catch (error) {
          console.error('❌ Auto-publish failed:', error instanceof Error ? error.message : String(error));
          // Don't exit in CI, let the workflow handle it
        }
      }
    }
  }
};

async function publishToNPM(options: any): Promise<void> {
  const { tag = 'latest', dryRun = false, otp } = options;

  console.log(`📦 Publishing to NPM with tag: ${tag}`);
  if (dryRun) {
    console.log('🔍 Dry run mode - would publish but not actually doing it');
    return;
  }

  // Check if package.json exists
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!await fs.pathExists(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  // Read package info
  const packageJson = await fs.readJson(packageJsonPath);
  const packageName = packageJson.name;
  const version = packageJson.version;

  console.log(`📦 Publishing ${packageName}@${version}...`);

  // Check if already published
  try {
    const result = execSync(`npm view ${packageName}@${version} version`, { stdio: 'pipe' });
    if (result.toString().trim() === version) {
      console.log(`⚠️  Version ${version} already published, skipping`);
      return;
    }
  } catch (error) {
    // Version doesn't exist, continue with publish
  }

  // Build package if needed
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log('🔨 Building package...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  // Run prepublish checks
  if (packageJson.scripts && packageJson.scripts.prepublishOnly) {
    console.log('🔍 Running prepublish checks...');
    execSync('npm run prepublishOnly', { stdio: 'inherit' });
  }

  // Prepare publish command
  let publishCmd = `npm publish --tag ${tag}`;

  if (otp) {
    publishCmd += ` --otp ${otp}`;
  }

  // Execute publish
  console.log(`🚀 Executing: ${publishCmd}`);
  execSync(publishCmd, { stdio: 'inherit' });

  console.log(`✅ Successfully published ${packageName}@${version} with tag ${tag}`);

  // Verify publication
  console.log('🔍 Verifying publication...');
  const verifyResult = execSync(`npm view ${packageName}@${version} version`, { stdio: 'pipe' });
  if (verifyResult.toString().trim() === version) {
    console.log(`✅ Publication verified: ${packageName}@${version}`);
  } else {
    throw new Error('Publication verification failed');
  }
}

async function publishToLocalRegistry(options: any): Promise<void> {
  const { registry = 'http://localhost:4873' } = options;

  console.log(`🏠 Publishing to local registry: ${registry}`);

  // Check if local registry is running
  try {
    execSync(`curl -s ${registry} > /dev/null`, { stdio: 'pipe' });
  } catch (error) {
    throw new Error(`Local registry at ${registry} is not accessible`);
  }

  // Set registry for this publish
  const originalRegistry = process.env.npm_config_registry;
  process.env.npm_config_registry = registry;

  try {
    await publishToNPM({
      tag: 'local',
      dryRun: false
    });
  } finally {
    // Restore original registry
    process.env.npm_config_registry = originalRegistry;
  }

  console.log(`✅ Published to local registry: ${registry}`);
}

export default extension;