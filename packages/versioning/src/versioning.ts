import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import simpleGit from 'simple-git';

export interface VersionConfig {
  rootPackageJson: string;
  packages: string[];
  changelogFile?: string;
  conventionalCommits?: boolean;
}

export class VersionManager {
  private config: VersionConfig;
  private git = simpleGit();

  constructor(config: VersionConfig) {
    this.config = {
      changelogFile: 'CHANGELOG.md',
      conventionalCommits: true,
      ...config
    };
  }

  async getCurrentVersion(): Promise<string> {
    const packageJson = await fs.readJson(this.config.rootPackageJson);
    return packageJson.version;
  }

  async bumpVersion(releaseType: semver.ReleaseType, preRelease?: string): Promise<string> {
    const currentVersion = await this.getCurrentVersion();
    const newVersion = preRelease
      ? semver.inc(currentVersion, releaseType, preRelease)
      : semver.inc(currentVersion, releaseType);

    if (!newVersion) {
      throw new Error(`Invalid version bump: ${releaseType} from ${currentVersion}`);
    }

    await this.updateVersion(newVersion);
    return newVersion;
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