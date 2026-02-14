import simpleGit from 'simple-git';
import * as semver from 'semver';

export interface BranchConfig {
  versionFormat: 'semantic' | 'dev' | 'feature' | 'hotfix';
  tagFormat: string;
  syncFiles: string[];
  environment: 'production' | 'development';
  bumpStrategy: 'semantic' | 'dev-build' | 'feature-branch' | 'hotfix';
}

export interface BranchAwarenessConfig {
  enabled: boolean;
  defaultBranch: string;
  branches: Record<string, BranchConfig>;
}

export interface BranchAwareOptions {
  branchAware?: boolean;
  targetBranch?: string;
  format?: string;
  build?: number;
}

export class BranchAwareManager {
  private git = simpleGit();
  private config: BranchAwarenessConfig;
  private buildCounters: Record<string, number> = {};

  constructor(config: BranchAwarenessConfig) {
    this.config = config;
  }

  /**
   * Get the current git branch
   */
  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'main';
  }

  /**
   * Detect branch configuration based on current or target branch
   */
  async detectBranchConfig(targetBranch?: string): Promise<BranchConfig> {
    const currentBranch = targetBranch || await this.getCurrentBranch();
    
    // Check exact matches first
    if (this.config.branches[currentBranch]) {
      return this.config.branches[currentBranch];
    }
    
    // Check pattern matches (feature/*, hotfix/*)
    for (const [pattern, branchConfig] of Object.entries(this.config.branches)) {
      if (pattern.includes('*') && this.matchPattern(currentBranch, pattern)) {
        return branchConfig;
      }
    }
    
    // Fallback to default branch config
    const defaultConfig = this.config.branches[this.config.defaultBranch];
    if (!defaultConfig) {
      throw new Error(`Default branch config not found for: ${this.config.defaultBranch}`);
    }
    return defaultConfig;
  }

  /**
   * Simple pattern matching for branch names
   * Supports wildcards like feature/* or hotfix/*
   */
  private matchPattern(branchName: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return branchName === pattern;
    
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*'); // Replace * with .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(branchName);
  }

  /**
   * Format version based on branch configuration
   */
  async formatVersion(
    baseVersion: string,
    branchConfig: BranchConfig,
    currentBranch?: string,
    buildNumber?: number
  ): Promise<string> {
    const branch = currentBranch || await this.getCurrentBranch();

    switch (branchConfig.versionFormat) {
      case 'semantic':
        // Standard semantic version: 1.8.172
        return baseVersion;

      case 'dev':
        // Dev format: 1.8.172-dev.395
        const devBuild = buildNumber || this.getNextBuildNumber('dev');
        return `${baseVersion}-dev.${devBuild}`;

      case 'feature':
        // Feature format: 1.8.172-feature/branch-name.395
        const featureBuild = buildNumber || this.getNextBuildNumber(branch);
        return `${baseVersion}-${branch}.${featureBuild}`;

      case 'hotfix':
        // Hotfix format: 1.8.172-hotfix/description.395
        const hotfixBuild = buildNumber || this.getNextBuildNumber(branch);
        return `${baseVersion}-${branch}.${hotfixBuild}`;

      default:
        return baseVersion;
    }
  }

  /**
   * Bump version with branch awareness
   */
  async bumpVersionBranchAware(
    currentVersion: string,
    releaseType: semver.ReleaseType,
    branchConfig: BranchConfig,
    currentBranch?: string,
    buildNumber?: number
  ): Promise<string> {
    const branch = currentBranch || await this.getCurrentBranch();

    // For non-production branches, extract base version if it has prerelease
    const cleanVersion = this.extractBaseVersion(currentVersion);

    let newBaseVersion: string;

    switch (branchConfig.bumpStrategy) {
      case 'semantic':
        // Standard semantic bump for production branches
        newBaseVersion = semver.inc(cleanVersion, releaseType) || cleanVersion;
        break;

      case 'dev-build':
        // Dev build: bump build number only, keep base version
        newBaseVersion = cleanVersion;
        break;

      case 'feature-branch':
      case 'hotfix':
        // Feature/hotfix: bump build number only
        newBaseVersion = cleanVersion;
        break;

      default:
        newBaseVersion = semver.inc(cleanVersion, releaseType) || cleanVersion;
    }

    return this.formatVersion(newBaseVersion, branchConfig, branch, buildNumber);
  }

  /**
   * Extract base semantic version from a version with prerelease
   * Examples: 
   *   1.8.172-dev.395 -> 1.8.172
   *   1.8.172-feature/new-ui.10 -> 1.8.172
   */
  private extractBaseVersion(version: string): string {
    const parsed = semver.parse(version);
    if (!parsed) {
      return version;
    }
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }

  /**
   * Get next build number for a branch
   */
  private getNextBuildNumber(branchKey: string): number {
    if (!this.buildCounters[branchKey]) {
      this.buildCounters[branchKey] = 1;
    }
    return this.buildCounters[branchKey]++;
  }

  /**
   * Check if branch awareness is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get sync files for a branch configuration
   */
  getSyncFiles(branchConfig: BranchConfig): string[] {
    return branchConfig.syncFiles;
  }
}

/**
 * Create a default branch awareness configuration
 */
export function createDefaultBranchAwarenessConfig(): BranchAwarenessConfig {
  return {
    enabled: false,
    defaultBranch: 'main',
    branches: {
      main: {
        versionFormat: 'semantic',
        tagFormat: 'v{version}',
        syncFiles: ['package.json', 'version.production.json'],
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
  };
}
