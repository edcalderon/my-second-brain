#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { VersionManager } from './versioning';
import { ChangelogManager } from './changelog';
import { SyncManager } from './sync';
import { ReleaseManager } from './release';
import { StatusManager } from './status';
import { loadExtensions, runExtensionHooks } from './extensions';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version?: string };

const program = new Command();

program
  .name('versioning')
  .description('Comprehensive versioning and changelog management for monorepos')
  .version(pkg.version || '0.0.0');

program
  .command('bump <type>')
  .description('Bump version (patch, minor, major, prerelease)')
  .option('-p, --pre-release <identifier>', 'prerelease identifier')
  .option('-c, --config <file>', 'config file path', 'versioning.config.json')
  .option('--no-commit', 'do not commit changes')
  .option('--no-tag', 'do not create git tag')
  .action(async (type, options) => {
    try {
      const config = await loadConfig(options.config);
      const versionManager = new VersionManager(config);
      const changelogManager = new ChangelogManager(config);

      // Pre-version hook
      await runExtensionHooks('preVersion', type, options);

      const newVersion = await versionManager.bumpVersion(type as any, options.preRelease);
      console.log(`Bumped version to ${newVersion}`);

      // Generate changelog
      await changelogManager.generate();
      console.log('Generated changelog');

      if (options.commit !== false) {
        await versionManager.commitChanges(newVersion);
        console.log('Committed changes');
      }

      if (options.tag !== false) {
        await versionManager.createGitTag(newVersion);
        console.log('Created git tag');
      }

      // Post-version hook
      await runExtensionHooks('postVersion', type, newVersion, options);

      console.log(`✅ Successfully released v${newVersion}`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('changelog')
  .description('Generate changelog')
  .option('-f, --from <commit>', 'from commit')
  .option('-t, --to <commit>', 'to commit')
  .option('-c, --config <file>', 'config file path', 'versioning.config.json')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const changelogManager = new ChangelogManager(config);

      // Pre-changelog hook
      await runExtensionHooks('preChangelog', options);

      await changelogManager.generate(options.from, options.to);

      // Post-changelog hook
      await runExtensionHooks('postChangelog', options);

      console.log('✅ Changelog generated');
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Sync versions across monorepo')
  .option('-v, --version <version>', 'target version to sync to')
  .option('-c, --config <file>', 'config file path', 'versioning.config.json')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const syncManager = new SyncManager(config);

      // Pre-sync hook
      await runExtensionHooks('preSync', options);

      await syncManager.syncVersions(options.version);
      console.log('✅ Versions synced');

      const validation = await syncManager.validateSync();
      if (!validation.valid) {
        console.log('⚠️  Validation issues:');
        validation.issues.forEach(issue => console.log(`  - ${issue}`));
      }

      // Post-sync hook
      await runExtensionHooks('postSync', options);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate version sync across monorepo')
  .option('-c, --config <file>', 'config file path', 'versioning.config.json')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const syncManager = new SyncManager(config);

      const validation = await syncManager.validateSync();
      if (validation.valid) {
        console.log('✅ All versions are in sync');
      } else {
        console.log('❌ Version sync issues:');
        validation.issues.forEach(issue => console.log(`  - ${issue}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('status')
  .alias('info')
  .description('Display version and sync status report')
  .option('-c, --config <file>', 'config file path', 'versioning.config.json')
  .option('--json', 'output as JSON')
  .option('--dot', 'output as Graphviz DOT format')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const statusManager = new StatusManager(config);

      if (options.json) {
        const json = await statusManager.getJSON();
        console.log(json);
      } else if (options.dot) {
        const dot = await statusManager.getDOT();
        console.log(dot);
      } else {
        const report = await statusManager.formatConsole();
        console.log(report);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('patch')
  .description('Create a patch release')
  .option('-p, --packages <packages>', 'Comma-separated list of packages to sync')
  .option('-m, --message <message>', 'Release commit message')
  .option('-c, --config <file>', 'Config file path', 'versioning.config.json')
  .option('--branch-aware', 'Enable branch-aware versioning')
  .option('--force-branch-aware', 'Force branch-aware mode even if disabled in config')
  .option('--target-branch <branch>', 'Explicit branch to apply branch-aware rules')
  .option('--format <format>', 'Override version format (semantic, dev, feature, hotfix)')
  .option('--build <number>', 'Override build number for non-semantic formats', parseBuildOption)
  .option('--no-tag', 'Do not create git tag')
  .option('--no-commit', 'Do not commit changes')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const versionManager = new VersionManager(config);
      const changelogManager = new ChangelogManager(config);
      const syncManager = new SyncManager(config);
      const releaseManager = new ReleaseManager({
        versionManager,
        changelogManager,
        syncManager,
        createTag: options.tag !== false,
        createCommit: options.commit !== false
      });

      const packages = options.packages ? options.packages.split(',').map((p: string) => p.trim()) : undefined;
      const newVersion = await releaseManager.patchRelease({
        packages,
        message: options.message,
        branchAware: options.branchAware,
        forceBranchAware: options.forceBranchAware,
        targetBranch: options.targetBranch,
        format: options.format,
        build: options.build
      });

      console.log(`✅ Patch release v${newVersion} completed`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('minor')
  .description('Create a minor release')
  .option('-p, --packages <packages>', 'Comma-separated list of packages to sync')
  .option('-m, --message <message>', 'Release commit message')
  .option('-c, --config <file>', 'Config file path', 'versioning.config.json')
  .option('--branch-aware', 'Enable branch-aware versioning')
  .option('--force-branch-aware', 'Force branch-aware mode even if disabled in config')
  .option('--target-branch <branch>', 'Explicit branch to apply branch-aware rules')
  .option('--format <format>', 'Override version format (semantic, dev, feature, hotfix)')
  .option('--build <number>', 'Override build number for non-semantic formats', parseBuildOption)
  .option('--no-tag', 'Do not create git tag')
  .option('--no-commit', 'Do not commit changes')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const versionManager = new VersionManager(config);
      const changelogManager = new ChangelogManager(config);
      const syncManager = new SyncManager(config);
      const releaseManager = new ReleaseManager({
        versionManager,
        changelogManager,
        syncManager,
        createTag: options.tag !== false,
        createCommit: options.commit !== false
      });

      const packages = options.packages ? options.packages.split(',').map((p: string) => p.trim()) : undefined;
      const newVersion = await releaseManager.minorRelease({
        packages,
        message: options.message,
        branchAware: options.branchAware,
        forceBranchAware: options.forceBranchAware,
        targetBranch: options.targetBranch,
        format: options.format,
        build: options.build
      });

      console.log(`✅ Minor release v${newVersion} completed`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('major')
  .description('Create a major release')
  .option('-p, --packages <packages>', 'Comma-separated list of packages to sync')
  .option('-m, --message <message>', 'Release commit message')
  .option('-c, --config <file>', 'Config file path', 'versioning.config.json')
  .option('--branch-aware', 'Enable branch-aware versioning')
  .option('--force-branch-aware', 'Force branch-aware mode even if disabled in config')
  .option('--target-branch <branch>', 'Explicit branch to apply branch-aware rules')
  .option('--format <format>', 'Override version format (semantic, dev, feature, hotfix)')
  .option('--build <number>', 'Override build number for non-semantic formats', parseBuildOption)
  .option('--no-tag', 'Do not create git tag')
  .option('--no-commit', 'Do not commit changes')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const versionManager = new VersionManager(config);
      const changelogManager = new ChangelogManager(config);
      const syncManager = new SyncManager(config);
      const releaseManager = new ReleaseManager({
        versionManager,
        changelogManager,
        syncManager,
        createTag: options.tag !== false,
        createCommit: options.commit !== false
      });

      const packages = options.packages ? options.packages.split(',').map((p: string) => p.trim()) : undefined;
      const newVersion = await releaseManager.majorRelease({
        packages,
        message: options.message,
        branchAware: options.branchAware,
        forceBranchAware: options.forceBranchAware,
        targetBranch: options.targetBranch,
        format: options.format,
        build: options.build
      });

      console.log(`✅ Major release v${newVersion} completed`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('release <version>')
  .description('Create a custom release')
  .option('-p, --packages <packages>', 'Comma-separated list of packages to sync')
  .option('-m, --message <message>', 'Release commit message')
  .option('-c, --config <file>', 'Config file path', 'versioning.config.json')
  .option('--no-tag', 'Do not create git tag')
  .option('--no-commit', 'Do not commit changes')
  .option('--skip-sync', 'Skip version synchronization')
  .action(async (version, options) => {
    try {
      const config = await loadConfig(options.config);
      const versionManager = new VersionManager(config);
      const changelogManager = new ChangelogManager(config);
      const syncManager = new SyncManager(config);
      const releaseManager = new ReleaseManager({
        versionManager,
        changelogManager,
        syncManager,
        createTag: options.tag !== false,
        createCommit: options.commit !== false
      });

      const packages = options.packages ? options.packages.split(',').map((p: string) => p.trim()) : undefined;
      await releaseManager.release(version, {
        packages,
        message: options.message,
        skipSync: options.skipSync
      });

      console.log(`✅ Release v${version} completed`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize versioning config')
  .option('-f, --force', 'overwrite existing config')
  .action(async (options) => {
    try {
      const configPath = 'versioning.config.json';
      if (!options.force && await fs.pathExists(configPath)) {
        console.error('❌ Config file already exists. Use --force to overwrite.');
        process.exit(1);
      }

      const defaultConfig = {
        rootPackageJson: 'package.json',
        packages: [],
        changelogFile: 'CHANGELOG.md',
        conventionalCommits: true,
        syncDependencies: false,
        ignorePackages: [],
        extensions: [], // Add extensions array to config
        branchAwareness: {
          enabled: false,
          defaultBranch: 'main',
          branches: {
            main: {
              versionFormat: 'semantic',
              tagFormat: 'v{version}',
              syncFiles: ['package.json'],
              environment: 'production',
              bumpStrategy: 'semantic'
            },
            develop: {
              versionFormat: 'dev',
              tagFormat: 'v{version}',
              syncFiles: ['version.development.json'],
              environment: 'development',
              bumpStrategy: 'dev-build'
            },
            'feature/*': {
              versionFormat: 'feature',
              tagFormat: 'v{version}',
              syncFiles: ['version.development.json'],
              environment: 'development',
              bumpStrategy: 'feature-branch'
            },
            'hotfix/*': {
              versionFormat: 'hotfix',
              tagFormat: 'v{version}',
              syncFiles: ['version.development.json'],
              environment: 'development',
              bumpStrategy: 'hotfix'
            }
          }
        }
      };

      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      console.log('✅ Initialized versioning config at versioning.config.json');
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

async function loadConfig(configPath: string): Promise<any> {
  if (!(await fs.pathExists(configPath))) {
    throw new Error(`Config file not found: ${configPath}. Run 'versioning init' to create one.`);
  }
  return await fs.readJson(configPath);
}

function parseBuildOption(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid build number "${value}". Use a non-negative integer.`);
  }
  return parsed;
}

async function main() {
  try {
    // Load and register extensions
    await loadExtensions(program);
    
    // Parse command line arguments
    program.parse();
  } catch (error) {
    console.error('❌ Error loading extensions:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
