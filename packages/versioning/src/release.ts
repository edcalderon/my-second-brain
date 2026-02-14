import * as fs from 'fs-extra';
import * as path from 'path';
import { VersionManager } from './index';
import { ChangelogManager } from './changelog';
import { BranchAwareOptions } from './branch-aware';

export interface ReleaseConfig {
  versionManager: VersionManager;
  changelogManager: ChangelogManager;
  syncManager: any; // Replace 'any' with the correct type if available
  createTag?: boolean;
  createCommit?: boolean;
  publish?: boolean;
}

export class ReleaseManager {
  private config: ReleaseConfig;

  constructor(config: ReleaseConfig) {
    this.config = {
      createTag: true,
      createCommit: true,
      publish: false,
      ...config
    };
  }

  async release(version: string, options: {
    message?: string;
    packages?: string[];
    skipSync?: boolean;
    branchAware?: boolean;
  } = {}): Promise<void> {
    const { message, packages, skipSync, branchAware } = options;

    // In branch-aware mode, version files have already been updated by bumpVersionBranchAware
    // So we skip the updateVersion and syncVersions calls
    if (!branchAware) {
      // Update versions (standard mode)
      await this.config.versionManager.updateVersion(version);

      // Sync specific packages if specified
      if (!skipSync && packages && packages.length > 0) {
        for (const pkg of packages) {
          const packageJsonPath = path.join(pkg, 'package.json');
          if (await fs.pathExists(packageJsonPath)) {
            await this.config.versionManager.updateVersion(version); // This needs to be package-specific
          }
        }
      } else if (!skipSync) {
        await this.config.syncManager.syncVersions(version);
      }
    }

    // Generate changelog
    await this.config.changelogManager.generate();

    // Commit changes
    if (this.config.createCommit) {
      await this.config.versionManager.commitChanges(version);
    }

    // Create git tag
    if (this.config.createTag) {
      await this.config.versionManager.createGitTag(version, message);
    }

    // Publish if requested (future implementation)
    if (this.config.publish) {
      await this.publishPackages(packages);
    }
  }

  private async publishPackages(packages?: string[]): Promise<void> {
    // TODO: Implement npm publish logic
    console.log('Publishing packages:', packages || 'all');
  }

  async patchRelease(options: { packages?: string[]; message?: string; branchAwareOptions?: BranchAwareOptions } = {}): Promise<string> {
    const currentVersion = await this.config.versionManager.getCurrentVersion();
    const newVersion = await this.config.versionManager.bumpVersion('patch', undefined, options.branchAwareOptions);
    await this.release(newVersion, { ...options, branchAware: !!options.branchAwareOptions });
    return newVersion;
  }

  async minorRelease(options: { packages?: string[]; message?: string; branchAwareOptions?: BranchAwareOptions } = {}): Promise<string> {
    const newVersion = await this.config.versionManager.bumpVersion('minor', undefined, options.branchAwareOptions);
    await this.release(newVersion, { ...options, branchAware: !!options.branchAwareOptions });
    return newVersion;
  }

  async majorRelease(options: { packages?: string[]; message?: string; branchAwareOptions?: BranchAwareOptions } = {}): Promise<string> {
    const newVersion = await this.config.versionManager.bumpVersion('major', undefined, options.branchAwareOptions);
    await this.release(newVersion, { ...options, branchAware: !!options.branchAwareOptions });
    return newVersion;
  }
}