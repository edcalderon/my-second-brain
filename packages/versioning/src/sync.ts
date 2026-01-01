import * as fs from 'fs-extra';
import * as path from 'path';
import { VersionManager, VersionConfig } from './versioning';

export interface SyncConfig extends VersionConfig {
  syncDependencies?: boolean;
  ignorePackages?: string[];
}

export class SyncManager {
  private config: SyncConfig;
  private versionManager: VersionManager;

  constructor(config: SyncConfig) {
    this.config = {
      syncDependencies: true,
      ignorePackages: [],
      ...config
    };
    this.versionManager = new VersionManager(config);
  }

  async syncVersions(targetVersion?: string): Promise<void> {
    const version = targetVersion || await this.versionManager.getCurrentVersion();

    // Update all packages to match root version
    for (const pkgPath of this.config.packages) {
      if (this.config.ignorePackages?.includes(path.basename(pkgPath))) {
        continue;
      }

      const packageJsonPath = path.join(pkgPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        await this.updatePackageVersion(packageJsonPath, version);

        if (this.config.syncDependencies) {
          await this.syncInternalDependencies(packageJsonPath, version);
        }
      }
    }
  }

  private async updatePackageVersion(packageJsonPath: string, version: string): Promise<void> {
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.version = version;
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  private async syncInternalDependencies(packageJsonPath: string, version: string): Promise<void> {
    const packageJson = await fs.readJson(packageJsonPath);
    const internalDeps = this.getInternalDependencies(packageJson);

    for (const dep of internalDeps) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = `^${version}`;
      }
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        packageJson.devDependencies[dep] = `^${version}`;
      }
      if (packageJson.peerDependencies && packageJson.peerDependencies[dep]) {
        packageJson.peerDependencies[dep] = `^${version}`;
      }
    }

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  private getInternalDependencies(packageJson: any): string[] {
    const allDeps = [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {})
    ];

    return allDeps.filter(dep => dep.startsWith('@ed/') || dep.startsWith('workspace:'));
  }

  async validateSync(): Promise<{ valid: boolean; issues: string[] }> {
    const rootVersion = await this.versionManager.getCurrentVersion();
    const issues: string[] = [];

    for (const pkgPath of this.config.packages) {
      const packageJsonPath = path.join(pkgPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        if (packageJson.version !== rootVersion) {
          issues.push(`${pkgPath}: version ${packageJson.version} does not match root ${rootVersion}`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}