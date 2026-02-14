import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import simpleGit from 'simple-git';
import { BranchAwarenessConfig, BranchAwareManager, BranchAwareOptions } from './branch-aware';

export interface VersionConfig {
  rootPackageJson: string;
  packages: string[];
  changelogFile?: string;
  conventionalCommits?: boolean;
  extensionConfig?: Record<string, any>;
  branchAwareness?: BranchAwarenessConfig;
}

export class VersionManager {
  private config: VersionConfig;
  private git = simpleGit();
  private branchAwareManager?: BranchAwareManager;

  constructor(config: VersionConfig) {
    this.config = {
      changelogFile: 'CHANGELOG.md',
      conventionalCommits: true,
      ...config
    };

    // Initialize branch awareness if enabled
    if (this.config.branchAwareness?.enabled) {
      this.branchAwareManager = new BranchAwareManager(this.config.branchAwareness);
    }
  }

  async getCurrentVersion(): Promise<string> {
    const packageJson = await fs.readJson(this.config.rootPackageJson);
    return packageJson.version;
  }

  async bumpVersion(releaseType: semver.ReleaseType, preRelease?: string, options?: BranchAwareOptions): Promise<string> {
    const currentVersion = await this.getCurrentVersion();

    // Check if branch-aware mode is enabled
    if (options?.branchAware && this.branchAwareManager && this.branchAwareManager.isEnabled()) {
      return this.bumpVersionBranchAware(releaseType, options);
    }

    // Standard version bump (existing behavior)
    const newVersion = preRelease
      ? semver.inc(currentVersion, releaseType, preRelease)
      : semver.inc(currentVersion, releaseType);

    if (!newVersion) {
      throw new Error(`Invalid version bump: ${releaseType} from ${currentVersion}`);
    }

    await this.updateVersion(newVersion);
    return newVersion;
  }

  /**
   * Bump version with branch awareness
   */
  async bumpVersionBranchAware(releaseType: semver.ReleaseType, options: BranchAwareOptions): Promise<string> {
    if (!this.branchAwareManager) {
      throw new Error('Branch awareness is not enabled');
    }

    const currentVersion = await this.getCurrentVersion();
    const branchConfig = await this.branchAwareManager.detectBranchConfig(options.targetBranch);
    const currentBranch = options.targetBranch || await this.branchAwareManager.getCurrentBranch();

    // Bump version according to branch strategy
    const newVersion = await this.branchAwareManager.bumpVersionBranchAware(
      currentVersion,
      releaseType,
      branchConfig,
      currentBranch,
      options.build
    );

    // Update only the files specified for this branch
    await this.updateVersionBranchAware(newVersion, branchConfig);

    return newVersion;
  }

  /**
   * Update version files based on branch configuration
   */
  async updateVersionBranchAware(newVersion: string, branchConfig: import('./branch-aware').BranchConfig): Promise<void> {
    const syncFiles = branchConfig.syncFiles || [];

    for (const file of syncFiles) {
      const filePath = path.resolve(file);

      // Check if it's a package.json file
      if (file.endsWith('package.json')) {
        await this.updatePackageJson(filePath, newVersion);
      } else if (file.endsWith('.json')) {
        // For version.*.json files, create or update them
        await this.updateVersionFile(filePath, newVersion);
      }
    }
  }

  /**
   * Update or create a version JSON file
   */
  async updateVersionFile(filePath: string, version: string): Promise<void> {
    interface VersionFileData {
      version: string;
      updatedAt: string;
      [key: string]: any;
    }

    let versionData: VersionFileData = {
      version: '',
      updatedAt: ''
    };

    // Read existing file if it exists
    if (await fs.pathExists(filePath)) {
      versionData = await fs.readJson(filePath);
    }

    // Update version
    versionData.version = version;
    versionData.updatedAt = new Date().toISOString();

    // Write back
    await fs.writeJson(filePath, versionData, { spaces: 2 });
  }

  async updateVersion(newVersion: string): Promise<void> {
    // Update root package.json
    await this.updatePackageJson(this.config.rootPackageJson, newVersion);

    // Update all specified packages
    for (const pkgPath of this.config.packages) {
      const packageJsonPath = path.join(pkgPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        await this.updatePackageJson(packageJsonPath, newVersion);
      }
    }
  }

  private async updatePackageJson(packageJsonPath: string, version: string): Promise<void> {
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.version = version;
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  async createGitTag(version: string, message?: string): Promise<void> {
    const tagMessage = message || `Release v${version}`;
    await this.git.addAnnotatedTag(`v${version}`, tagMessage);
  }

  async commitChanges(version: string): Promise<void> {
    const commitMessage = this.config.conventionalCommits
      ? `chore: release v${version}`
      : `Release v${version}`;

    await this.git.add('.');
    await this.git.commit(commitMessage);
  }
}