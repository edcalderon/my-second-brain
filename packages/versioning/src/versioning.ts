import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import simpleGit from 'simple-git';

export interface BranchRuleConfig {
  versionFormat?: 'semantic' | 'dev' | 'feature' | 'hotfix' | string;
  tagFormat?: string;
  syncFiles?: string[];
  environment?: string;
  bumpStrategy?: 'semantic' | 'dev-build' | 'feature-branch' | 'hotfix' | string;
}

export interface BranchAwarenessConfig {
  enabled?: boolean;
  defaultBranch?: string;
  branches?: Record<string, BranchRuleConfig>;
}

export interface BranchAwareBumpOptions {
  targetBranch?: string;
  forceBranchAware?: boolean;
  format?: string;
  build?: number;
}

export interface BranchAwareBumpResult {
  version: string;
  branch: string;
  matchPattern: string;
  versionFormat: string;
  tagFormat: string;
  syncFiles: string[];
}

interface ResolvedBranchRuleConfig extends BranchRuleConfig {
  versionFormat: string;
  tagFormat: string;
  syncFiles: string[];
  bumpStrategy: string;
}

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

  async bumpVersionBranchAware(
    releaseType: semver.ReleaseType,
    options: BranchAwareBumpOptions = {}
  ): Promise<BranchAwareBumpResult> {
    if (options.build !== undefined && (!Number.isInteger(options.build) || options.build < 0)) {
      throw new Error(`Invalid build number "${options.build}". Expected a non-negative integer.`);
    }

    const branch = options.targetBranch || await this.getCurrentBranch();
    const { matchPattern, resolvedConfig } = this.resolveBranchConfig(branch, options.forceBranchAware === true);
    const versionFormat = options.format || resolvedConfig.versionFormat;
    const version = await this.buildBranchAwareVersion(releaseType, branch, versionFormat, resolvedConfig, options.build);
    const syncFiles = resolvedConfig.syncFiles.length > 0
      ? resolvedConfig.syncFiles
      : this.getDefaultSyncFiles(versionFormat);

    if (syncFiles.length === 0) {
      throw new Error(`No sync files configured for branch "${branch}".`);
    }

    for (const filePath of syncFiles) {
      await this.updateVersionFile(filePath, version);
    }

    return {
      version,
      branch,
      matchPattern,
      versionFormat,
      tagFormat: resolvedConfig.tagFormat,
      syncFiles
    };
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
    await this.createGitTagWithFormat(version, 'v{version}', message);
  }

  async createGitTagWithFormat(version: string, tagFormat = 'v{version}', message?: string): Promise<string> {
    const tagName = this.renderTag(tagFormat, version);
    const tagMessage = message || `Release ${tagName}`;
    await this.git.addAnnotatedTag(tagName, tagMessage);
    return tagName;
  }

  async commitChanges(version: string): Promise<void> {
    const commitMessage = this.config.conventionalCommits
      ? `chore: release v${version}`
      : `Release v${version}`;

    await this.git.add('.');
    await this.git.commit(commitMessage);
  }

  private async getCurrentBranch(): Promise<string> {
    const branch = (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
    if (!branch) {
      throw new Error('Unable to detect current Git branch.');
    }
    return branch;
  }

  private resolveBranchConfig(
    branch: string,
    forceBranchAware: boolean
  ): { matchPattern: string; resolvedConfig: ResolvedBranchRuleConfig } {
    const branchAwareness = this.getBranchAwarenessConfig(forceBranchAware);
    const { branches } = branchAwareness;

    if (branches[branch]) {
      return {
        matchPattern: branch,
        resolvedConfig: this.normalizeBranchRule(branches[branch])
      };
    }

    const wildcardPatterns = Object.keys(branches)
      .filter((pattern) => pattern.includes('*'))
      .sort((a, b) => b.length - a.length);

    for (const pattern of wildcardPatterns) {
      if (this.matchesPattern(branch, pattern)) {
        return {
          matchPattern: pattern,
          resolvedConfig: this.normalizeBranchRule(branches[pattern])
        };
      }
    }

    const fallbackPattern = branchAwareness.defaultBranch;
    if (fallbackPattern && branches[fallbackPattern]) {
      return {
        matchPattern: fallbackPattern,
        resolvedConfig: this.normalizeBranchRule(branches[fallbackPattern])
      };
    }

    throw new Error(`No branch configuration matched "${branch}".`);
  }

  private getBranchAwarenessConfig(forceBranchAware: boolean): {
    defaultBranch: string;
    branches: Record<string, BranchRuleConfig>;
  } {
    const configured = this.config.branchAwareness;
    const defaultBranch = configured?.defaultBranch || 'main';
    const configuredBranches = configured?.branches && Object.keys(configured.branches).length > 0
      ? configured.branches
      : this.getDefaultBranchRules(defaultBranch);

    if (!configured?.enabled && !forceBranchAware) {
      throw new Error('Branch awareness is not enabled in versioning.config.json.');
    }

    return {
      defaultBranch,
      branches: configuredBranches
    };
  }

  private getDefaultBranchRules(defaultBranch: string): Record<string, BranchRuleConfig> {
    const rootPackageJson = this.config.rootPackageJson || 'package.json';
    const defaults: Record<string, BranchRuleConfig> = {
      main: {
        versionFormat: 'semantic',
        tagFormat: 'v{version}',
        syncFiles: [rootPackageJson],
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
    };

    if (!defaults[defaultBranch]) {
      defaults[defaultBranch] = {
        versionFormat: 'semantic',
        tagFormat: 'v{version}',
        syncFiles: [rootPackageJson],
        environment: 'production',
        bumpStrategy: 'semantic'
      };
    }

    return defaults;
  }

  private normalizeBranchRule(branchRule?: BranchRuleConfig): ResolvedBranchRuleConfig {
    const versionFormat = branchRule?.versionFormat || 'semantic';
    return {
      ...branchRule,
      versionFormat,
      tagFormat: branchRule?.tagFormat || 'v{version}',
      syncFiles: branchRule?.syncFiles || [],
      bumpStrategy: branchRule?.bumpStrategy || this.getDefaultBumpStrategy(versionFormat)
    };
  }

  private getDefaultBumpStrategy(versionFormat: string): string {
    switch (versionFormat) {
      case 'semantic':
        return 'semantic';
      case 'feature':
        return 'feature-branch';
      case 'hotfix':
        return 'hotfix';
      case 'dev':
      default:
        return 'dev-build';
    }
  }

  private async buildBranchAwareVersion(
    releaseType: semver.ReleaseType,
    branch: string,
    versionFormat: string,
    branchConfig: ResolvedBranchRuleConfig,
    explicitBuild?: number
  ): Promise<string> {
    const currentVersion = await this.getCurrentVersion();
    const baseVersion = this.coerceBaseVersion(currentVersion);
    const shouldBumpSemantic = this.shouldBumpSemantic(releaseType, versionFormat, branchConfig.bumpStrategy);
    const semanticVersion = shouldBumpSemantic ? this.incrementSemanticVersion(baseVersion, releaseType) : baseVersion;

    if (versionFormat === 'semantic') {
      return semanticVersion;
    }

    const buildNumber = explicitBuild ?? await this.resolveBuildNumber(branchConfig.syncFiles, versionFormat, branch);
    return this.applyVersionFormat(versionFormat, semanticVersion, branch, buildNumber);
  }

  private shouldBumpSemantic(
    releaseType: semver.ReleaseType,
    versionFormat: string,
    bumpStrategy: string
  ): boolean {
    if (versionFormat === 'semantic') {
      return true;
    }

    if (bumpStrategy === 'semantic') {
      return true;
    }

    return releaseType !== 'patch';
  }

  private coerceBaseVersion(version: string): string {
    const parsed = semver.parse(version) || semver.coerce(version);
    if (!parsed) {
      throw new Error(`Unable to parse semantic base version from "${version}".`);
    }
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }

  private incrementSemanticVersion(version: string, releaseType: semver.ReleaseType): string {
    const incremented = semver.inc(version, releaseType);
    if (!incremented) {
      throw new Error(`Invalid semantic version bump: ${releaseType} from ${version}`);
    }
    return incremented;
  }

  private async resolveBuildNumber(syncFiles: string[], versionFormat: string, branch: string): Promise<number> {
    const candidateFiles = syncFiles.length > 0 ? syncFiles : this.getDefaultSyncFiles(versionFormat);
    let highestBuild = 0;

    for (const filePath of candidateFiles) {
      const existingVersion = await this.readVersionFromFile(filePath);
      if (!existingVersion) {
        continue;
      }

      const existingBuild = this.extractBuildNumber(existingVersion, versionFormat, branch);
      if (existingBuild !== null) {
        highestBuild = Math.max(highestBuild, existingBuild);
      }
    }

    const rootVersion = await this.getCurrentVersion();
    const rootBuild = this.extractBuildNumber(rootVersion, versionFormat, branch);
    if (rootBuild !== null) {
      highestBuild = Math.max(highestBuild, rootBuild);
    }

    return highestBuild + 1;
  }

  private getDefaultSyncFiles(versionFormat: string): string[] {
    if (versionFormat === 'semantic') {
      return [this.config.rootPackageJson];
    }
    return ['version.development.json'];
  }

  private applyVersionFormat(versionFormat: string, semanticVersion: string, branch: string, build: number): string {
    if (versionFormat === 'dev') {
      return `${semanticVersion}-dev.${build}`;
    }

    if (versionFormat === 'feature' || versionFormat === 'hotfix') {
      return `${semanticVersion}-${branch}.${build}`;
    }

    const normalizedFormat = versionFormat.includes('{branch}')
      ? versionFormat.replace(/\{branch\}/g, branch)
      : versionFormat;
    return `${semanticVersion}-${normalizedFormat}.${build}`;
  }

  private extractBuildNumber(version: string, versionFormat: string, branch: string): number | null {
    let match: RegExpMatchArray | null = null;

    if (versionFormat === 'dev') {
      match = version.match(/-dev\.(\d+)$/);
    } else if (versionFormat === 'feature') {
      match = version.match(/-feature\/.+\.(\d+)$/);
    } else if (versionFormat === 'hotfix') {
      match = version.match(/-hotfix\/.+\.(\d+)$/);
    } else {
      const normalizedFormat = versionFormat.includes('{branch}')
        ? versionFormat.replace(/\{branch\}/g, branch)
        : versionFormat;
      const escapedFormat = this.escapeRegex(normalizedFormat);
      match = version.match(new RegExp(`-${escapedFormat}\\.(\\d+)$`));
    }

    if (!match) {
      return null;
    }

    return Number.parseInt(match[1], 10);
  }

  private async readVersionFromFile(filePath: string): Promise<string | null> {
    if (!(await fs.pathExists(filePath))) {
      return null;
    }

    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.json') {
      try {
        const jsonContent = await fs.readJson(filePath);
        if (typeof jsonContent === 'string') {
          return jsonContent;
        }
        if (jsonContent && typeof jsonContent === 'object') {
          const version = (jsonContent as Record<string, unknown>).version;
          if (typeof version === 'string') {
            return version;
          }
        }
      } catch {
        return null;
      }

      return null;
    }

    const content = await fs.readFile(filePath, 'utf8');
    const normalized = content.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private async updateVersionFile(filePath: string, version: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.json') {
      let jsonContent: unknown = {};

      if (await fs.pathExists(filePath)) {
        try {
          jsonContent = await fs.readJson(filePath);
        } catch {
          jsonContent = {};
        }
      }

      if (!jsonContent || typeof jsonContent !== 'object' || Array.isArray(jsonContent)) {
        jsonContent = {};
      }

      const nextContent = jsonContent as Record<string, unknown>;
      nextContent.version = version;
      await fs.writeJson(filePath, nextContent, { spaces: 2 });
      return;
    }

    await fs.writeFile(filePath, `${version}\n`, 'utf8');
  }

  private matchesPattern(branch: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return branch === pattern;
    }

    const escapedPattern = pattern
      .split('*')
      .map((part) => this.escapeRegex(part))
      .join('.*');
    const regex = new RegExp(`^${escapedPattern}$`);
    return regex.test(branch);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private renderTag(tagFormat: string, version: string): string {
    return tagFormat.includes('{version}')
      ? tagFormat.replace(/\{version\}/g, version)
      : tagFormat;
  }
}
