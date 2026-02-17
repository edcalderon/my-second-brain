import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import simpleGit from 'simple-git';
import { VersionManager, VersionConfig } from './versioning';
import { SyncManager, SyncConfig } from './sync';

export interface StatusOptions {
  json?: boolean;
}

export interface PackageStatus {
  name: string;
  path: string;
  version: string;
  inSync: boolean;
  dependencies?: Record<string, DependencyStatus>;
}

export interface DependencyStatus {
  name: string;
  currentVersion: string;
  expectedVersion?: string;
  isStale: boolean;
  isMissing: boolean;
}

export interface InstallationInfo {
  cliVersion: string;
  nodeVersion: string;
  packageManager: string;
  configPath: string;
  configValid: boolean;
  configValidationMessage?: string;
  gitBranch: string;
  gitStatus: 'clean' | 'dirty';
}

export interface VersionFreshness {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updateType?: 'major' | 'minor' | 'patch';
}

export interface SyncHealth {
  packages: PackageStatus[];
  allInSync: boolean;
  totalPackages: number;
  packagesInSync: number;
  packagesOutOfSync: number;
}

export interface StatusReport {
  installation: InstallationInfo;
  versionFreshness: VersionFreshness;
  syncHealth: SyncHealth;
}

export class StatusManager {
  private config: SyncConfig;
  private versionManager: VersionManager;
  private syncManager: SyncManager;
  private git = simpleGit();

  constructor(config: SyncConfig) {
    this.config = config;
    this.versionManager = new VersionManager(config);
    this.syncManager = new SyncManager(config);
  }

  async getStatus(): Promise<StatusReport> {
    const [installation, versionFreshness, syncHealth] = await Promise.all([
      this.getInstallationInfo(),
      this.getVersionFreshness(),
      this.getSyncHealth()
    ]);

    return {
      installation,
      versionFreshness,
      syncHealth
    };
  }

  private async getInstallationInfo(): Promise<InstallationInfo> {
    // Get CLI version from package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    const cliVersion = packageJson.version || 'unknown';

    // Get Node.js version
    const nodeVersion = process.version;

    // Detect package manager
    const packageManager = this.detectPackageManager();

    // Check config
    const configPath = this.config.rootPackageJson ? path.dirname(this.config.rootPackageJson) : process.cwd();
    const configFilePath = path.join(configPath, 'versioning.config.json');
    let configValid = true;
    let configValidationMessage: string | undefined;

    try {
      if (await fs.pathExists(configFilePath)) {
        await fs.readJson(configFilePath);
      } else {
        configValid = false;
        configValidationMessage = 'Config file not found';
      }
    } catch (error) {
      configValid = false;
      configValidationMessage = error instanceof Error ? error.message : 'Invalid JSON';
    }

    // Get git status
    let gitBranch = 'unknown';
    let gitStatus: 'clean' | 'dirty' = 'clean';

    try {
      const status = await this.git.status();
      gitBranch = status.current || 'unknown';
      gitStatus = status.isClean() ? 'clean' : 'dirty';
    } catch (error) {
      // Not a git repo or git not available
    }

    return {
      cliVersion,
      nodeVersion,
      packageManager,
      configPath: configFilePath,
      configValid,
      configValidationMessage,
      gitBranch,
      gitStatus
    };
  }

  private detectPackageManager(): string {
    try {
      // Check for pnpm-lock.yaml
      if (fs.existsSync('pnpm-lock.yaml')) {
        return 'pnpm';
      }
      // Check for yarn.lock
      if (fs.existsSync('yarn.lock')) {
        return 'yarn';
      }
      // Check for package-lock.json
      if (fs.existsSync('package-lock.json')) {
        return 'npm';
      }
      // Default to npm
      return 'npm';
    } catch (error) {
      return 'npm';
    }
  }

  private async getVersionFreshness(): Promise<VersionFreshness> {
    const currentVersion = await this.versionManager.getCurrentVersion();
    let latestVersion = currentVersion;
    let updateAvailable = false;
    let updateType: 'major' | 'minor' | 'patch' | undefined;

    try {
      // Try to get the latest version from npm registry
      const result = execSync('npm view @edcalderon/versioning version', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      
      latestVersion = result;

      // Compare versions
      if (this.isNewerVersion(latestVersion, currentVersion)) {
        updateAvailable = true;
        updateType = this.getUpdateType(currentVersion, latestVersion);
      }
    } catch (error) {
      // If npm view fails, just use current version
    }

    return {
      currentVersion,
      latestVersion,
      updateAvailable,
      updateType
    };
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }
    return false;
  }

  private getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    if (latestParts[0] > currentParts[0]) {
      return 'major';
    }
    if (latestParts[1] > currentParts[1]) {
      return 'minor';
    }
    return 'patch';
  }

  private async getSyncHealth(): Promise<SyncHealth> {
    const rootVersion = await this.versionManager.getCurrentVersion();
    const packages: PackageStatus[] = [];

    for (const pkgPath of this.config.packages) {
      const packageJsonPath = path.join(pkgPath, 'package.json');
      
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        const version = packageJson.version || 'unknown';
        const inSync = version === rootVersion;
        const dependencies = await this.getDependencyStatus(packageJson, rootVersion);

        packages.push({
          name: packageJson.name || path.basename(pkgPath),
          path: pkgPath,
          version,
          inSync,
          dependencies
        });
      }
    }

    const packagesInSync = packages.filter(p => p.inSync).length;
    const packagesOutOfSync = packages.length - packagesInSync;

    return {
      packages,
      allInSync: packagesOutOfSync === 0,
      totalPackages: packages.length,
      packagesInSync,
      packagesOutOfSync
    };
  }

  private async getDependencyStatus(
    packageJson: any,
    expectedVersion: string
  ): Promise<Record<string, DependencyStatus>> {
    const dependencies: Record<string, DependencyStatus> = {};
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Get internal package names from config
    const internalPackages = new Set<string>();
    for (const pkgPath of this.config.packages) {
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      if (await fs.pathExists(pkgJsonPath)) {
        const pkgJson = await fs.readJson(pkgJsonPath);
        if (pkgJson.name) {
          internalPackages.add(pkgJson.name);
        }
      }
    }

    // Check each dependency
    for (const [depName, depVersion] of Object.entries(allDeps)) {
      if (internalPackages.has(depName)) {
        const currentVersion = (depVersion as string).replace(/^[\^~]/, '');
        const isStale = currentVersion !== expectedVersion;

        dependencies[depName] = {
          name: depName,
          currentVersion,
          expectedVersion,
          isStale,
          isMissing: false
        };
      }
    }

    return dependencies;
  }

  formatStatus(report: StatusReport, options: StatusOptions = {}): string {
    if (options.json) {
      return JSON.stringify(report, null, 2);
    }

    const lines: string[] = [];

    // Installation / Environment
    lines.push(`Versioning CLI: ${report.installation.cliVersion}`);
    if (report.versionFreshness.updateAvailable && report.versionFreshness.updateType) {
      lines.push(`Latest available: ${report.versionFreshness.latestVersion}  (update available: ${report.versionFreshness.updateType})`);
    }
    lines.push(`Node.js: ${report.installation.nodeVersion}`);
    lines.push(`Package manager: ${report.installation.packageManager}`);
    lines.push(`Config: ${report.installation.configPath} (${report.installation.configValid ? 'valid' : 'invalid'})`);
    if (!report.installation.configValid && report.installation.configValidationMessage) {
      lines.push(`  Error: ${report.installation.configValidationMessage}`);
    }
    lines.push(`Git: branch=${report.installation.gitBranch}, working-tree=${report.installation.gitStatus}`);
    lines.push('');

    // Sync status
    lines.push('Sync status:');
    for (const pkg of report.syncHealth.packages) {
      const marker = pkg.inSync ? '✓' : '✗';
      const suffix = pkg.inSync ? '' : ' (out of sync)';
      lines.push(`  ${marker} ${pkg.path.padEnd(30)} ${pkg.version}${suffix}`);
    }
    lines.push('');

    // Dependency graph
    lines.push('Dependency graph (synced apps):');
    for (const pkg of report.syncHealth.packages) {
      lines.push(`  ${pkg.path}`);
      
      if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
        const deps = Object.values(pkg.dependencies);
        deps.forEach((dep, index) => {
          const isLast = index === deps.length - 1;
          const prefix = isLast ? '└──' : '├──';
          const marker = dep.isStale ? '✗ stale' : '✓';
          const expected = dep.isStale ? ` (expected ${dep.expectedVersion})` : '';
          lines.push(`  ${prefix} ${dep.name}@${dep.currentVersion} ${marker}${expected}`);
        });
      }
    }

    return lines.join('\n');
  }
}
