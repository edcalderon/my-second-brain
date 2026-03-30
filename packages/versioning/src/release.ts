import * as fs from 'fs-extra';
import * as path from 'path';
import { VersionManager } from './index';
import { ChangelogManager } from './changelog';
import * as semver from 'semver';
import { getExtensionContext, runExtensionHooks } from './extensions';
import { deriveTagPrefixFromFormat, renderTagFormat, runReleaseGuard } from './release-guard';

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
    tagFormat?: string;
  } = {}): Promise<void> {
    const { message, packages, skipSync, tagFormat = 'v{version}' } = options;
    const versionConfig = this.config.versionManager.getConfig();
    const releaseGuardHookLoaded = getExtensionContext()?.loadedExtensions.includes('release-guard') ?? false;

    // Update versions
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

    if (releaseGuardHookLoaded) {
      await runExtensionHooks('preRelease', version, {
        config: versionConfig,
        message,
        packages,
        skipSync,
        tagFormat
      });
    } else if (this.config.createTag !== false) {
      const guardConfig = versionConfig.releaseGuard;
      if (guardConfig?.enabled) {
        const tag = renderTagFormat(tagFormat, version);
        await runReleaseGuard(versionConfig, {
          tag,
          tagFormat,
          packages,
          metadataFiles: guardConfig.metadataFiles,
          allowBuildMetadata: guardConfig.allowBuildMetadata,
          checkReleaseFloor: guardConfig.checkReleaseFloor,
          tagPrefix: deriveTagPrefixFromFormat(tagFormat)
        });
      }
    }

    // Generate changelog
    await this.config.changelogManager.generate();
    await runExtensionHooks('postChangelog', {});

    // Commit changes
    if (this.config.createCommit) {
      await this.config.versionManager.commitChanges(version);
    }

    // Create git tag
    if (this.config.createTag) {
      await this.config.versionManager.createGitTagWithFormat(version, tagFormat, message);
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

  async patchRelease(options: ReleaseOptions = {}): Promise<string> {
    if (this.shouldUseBranchAwareFlow(options)) {
      return await this.releaseBranchAware('patch', options);
    }

    const newVersion = await this.config.versionManager.bumpVersion('patch');
    await this.release(newVersion, options);
    return newVersion;
  }

  async minorRelease(options: ReleaseOptions = {}): Promise<string> {
    if (this.shouldUseBranchAwareFlow(options)) {
      return await this.releaseBranchAware('minor', options);
    }

    const newVersion = await this.config.versionManager.bumpVersion('minor');
    await this.release(newVersion, options);
    return newVersion;
  }

  async majorRelease(options: ReleaseOptions = {}): Promise<string> {
    if (this.shouldUseBranchAwareFlow(options)) {
      return await this.releaseBranchAware('major', options);
    }

    const newVersion = await this.config.versionManager.bumpVersion('major');
    await this.release(newVersion, options);
    return newVersion;
  }

  private shouldUseBranchAwareFlow(options: ReleaseOptions): boolean {
    return options.branchAware === true
      || options.forceBranchAware === true
      || typeof options.targetBranch === 'string'
      || typeof options.format === 'string'
      || typeof options.build === 'number';
  }

  private async releaseBranchAware(
    releaseType: semver.ReleaseType,
    options: ReleaseOptions
  ): Promise<string> {
    const versionConfig = this.config.versionManager.getConfig();
    const releaseGuardHookLoaded = getExtensionContext()?.loadedExtensions.includes('release-guard') ?? false;
    const result = await this.config.versionManager.bumpVersionBranchAware(releaseType, {
      targetBranch: options.targetBranch,
      forceBranchAware: options.forceBranchAware,
      format: options.format,
      build: options.build
    });

    if (releaseGuardHookLoaded) {
      await runExtensionHooks('preRelease', result.version, {
        config: versionConfig,
        message: options.message,
        packages: options.packages,
        skipSync: options.skipSync,
        tagFormat: result.tagFormat
      });
    } else if (this.config.createTag !== false) {
      const guardConfig = versionConfig.releaseGuard;
      if (guardConfig?.enabled) {
        const tag = renderTagFormat(result.tagFormat, result.version);
        await runReleaseGuard(versionConfig, {
          tag,
          tagFormat: result.tagFormat,
          packages: options.packages,
          metadataFiles: [...(guardConfig.metadataFiles || []), ...result.syncFiles],
          allowBuildMetadata: guardConfig.allowBuildMetadata,
          checkReleaseFloor: guardConfig.checkReleaseFloor,
          tagPrefix: deriveTagPrefixFromFormat(result.tagFormat)
        });
      }
    }

    await this.config.changelogManager.generate();
    await runExtensionHooks('postChangelog', {});

    if (this.config.createCommit) {
      await this.config.versionManager.commitChanges(result.version);
    }

    if (this.config.createTag) {
      await this.config.versionManager.createGitTagWithFormat(result.version, result.tagFormat, options.message);
    }

    if (this.config.publish) {
      await this.publishPackages(options.packages);
    }

    return result.version;
  }
}

interface ReleaseOptions {
  message?: string;
  packages?: string[];
  skipSync?: boolean;
  branchAware?: boolean;
  forceBranchAware?: boolean;
  targetBranch?: string;
  format?: string;
  build?: number;
}
