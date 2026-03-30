import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import simpleGit from 'simple-git';
import type { VersionConfig } from './versioning';

export interface ReleaseGuardConfig {
  enabled?: boolean;
  tagPrefix?: string;
  allowBuildMetadata?: boolean;
  checkReleaseFloor?: boolean;
  metadataFiles?: string[];
}

export interface ReleaseGuardOptions {
  tag: string;
  tagPrefix?: string;
  tagFormat?: string;
  packages?: string[];
  metadataFiles?: string[];
  allowBuildMetadata?: boolean;
  checkReleaseFloor?: boolean;
}

export interface ReleaseGuardTargetResult {
  path: string;
  version: string;
  source: 'root' | 'package' | 'metadata';
}

export interface ReleaseGuardResult {
  tag: string;
  tagPrefix: string;
  normalizedTag: string;
  targetResults: ReleaseGuardTargetResult[];
  floor?: {
    value: string;
    source: string;
  };
}

interface ParsedReleaseVersion {
  version: semver.SemVer;
  buildRank: number;
}

export function deriveTagPrefixFromFormat(tagFormat: string): string {
  return tagFormat.includes('{version}')
    ? tagFormat.replace(/\{version\}/g, '')
    : tagFormat;
}

function parseBuildRank(version: semver.SemVer): number {
  if (version.build.length === 0) {
    return 0;
  }

  for (let index = version.build.length - 1; index >= 0; index -= 1) {
    const parsed = Number.parseInt(version.build[index], 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function parseReleaseVersion(version: string): ParsedReleaseVersion {
  const parsed = semver.parse(version);
  if (!parsed) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  return {
    version: parsed,
    buildRank: parseBuildRank(parsed)
  };
}

function compareReleaseVersions(left: string, right: string): number {
  const leftParsed = parseReleaseVersion(left);
  const rightParsed = parseReleaseVersion(right);
  const baseComparison = semver.compare(leftParsed.version, rightParsed.version);

  if (baseComparison !== 0) {
    return baseComparison;
  }

  return leftParsed.buildRank - rightParsed.buildRank;
}

function normalizeTag(tag: string, prefix: string, allowBuildMetadata: boolean): string {
  const trimmed = tag.trim();
  const withoutPrefix = prefix && trimmed.startsWith(prefix)
    ? trimmed.slice(prefix.length)
    : trimmed;

  return withoutPrefix;
}

export function stripTag(tag: string, prefix = 'v', allowBuildMetadata = true): string {
  return normalizeTag(tag, prefix, allowBuildMetadata);
}

export function renderTagFormat(tagFormat: string, version: string): string {
  return tagFormat.includes('{version}')
    ? tagFormat.replace(/\{version\}/g, version)
    : `${tagFormat}${version}`;
}

export async function readVersionFromPath(filePath: string): Promise<string | null> {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }

  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.json') {
    try {
      const jsonContent = await fs.readJson(filePath);
      if (typeof jsonContent === 'string') {
        return jsonContent.trim() || null;
      }

      if (jsonContent && typeof jsonContent === 'object') {
        const version = (jsonContent as Record<string, unknown>).version;
        if (typeof version === 'string') {
          return version.trim() || null;
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

async function expandPackageEntries(packageEntries: string[]): Promise<string[]> {
  const expanded = new Set<string>();

  for (const entry of packageEntries) {
    const normalizedEntry = entry.trim();
    if (!normalizedEntry) {
      continue;
    }

    if (normalizedEntry.includes('*')) {
      const starIndex = normalizedEntry.indexOf('*');
      const baseDir = normalizedEntry.slice(0, starIndex).replace(/[\\/]+$/, '') || '.';
      if (!(await fs.pathExists(baseDir))) {
        continue;
      }

      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      for (const child of entries) {
        if (child.isDirectory()) {
          expanded.add(path.join(baseDir, child.name));
        }
      }
      continue;
    }

    expanded.add(normalizedEntry);
  }

  return [...expanded];
}

async function collectTargetResults(
  config: VersionConfig,
  options: ReleaseGuardOptions
): Promise<ReleaseGuardTargetResult[]> {
  const targetResults: ReleaseGuardTargetResult[] = [];
  const targetPaths = new Set<string>();

  const rootPackageJson = config.rootPackageJson || 'package.json';
  targetPaths.add(rootPackageJson);

  const packageEntries = options.packages ?? config.packages ?? [];
  const expandedPackages = await expandPackageEntries(packageEntries);
  for (const packageEntry of expandedPackages) {
    targetPaths.add(packageEntry.endsWith('.json') ? packageEntry : path.join(packageEntry, 'package.json'));
  }

  const metadataFiles = options.metadataFiles ?? config.releaseGuard?.metadataFiles ?? [];
  for (const metadataFile of metadataFiles) {
    targetPaths.add(metadataFile);
  }

  for (const filePath of targetPaths) {
    const version = await readVersionFromPath(filePath);
    if (!version) {
      continue;
    }

    targetResults.push({
      path: filePath,
      version,
      source: filePath === rootPackageJson
        ? 'root'
        : metadataFiles.includes(filePath)
          ? 'metadata'
          : 'package'
    });

  }

  return targetResults;
}

async function loadGitReleaseFloor(tagPrefix: string): Promise<{ value: string; source: string } | null> {
  const git = simpleGit();

  try {
    const tagResult = await git.tags();
    const candidates = (tagResult.all || [])
      .filter((tag) => tagPrefix.length === 0 || tag.startsWith(tagPrefix))
      .map((tag) => ({
        raw: tag,
        version: stripTag(tag, tagPrefix, true)
      }))
      .filter((candidate) => semver.valid(candidate.version) !== null);

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((left, right) => compareReleaseVersions(left.version, right.version));
    const highest = candidates[candidates.length - 1];
    return {
      value: highest.version,
      source: 'git-tags'
    };
  } catch {
    return null;
  }
}

function buildMismatchMessage(tag: string, tagPrefix: string, targetResults: ReleaseGuardTargetResult[]): string {
  const comparisons = targetResults.map((target) => `${target.path}=${target.version}`).join(', ');
  return `Release guard blocked ${tag} (prefix ${tagPrefix}). Expected all tracked versions to match, but found: ${comparisons}`;
}

function buildFloorMessage(tag: string, floor: { value: string; source: string }): string {
  return `Release guard blocked ${tag} because it is below the current release floor ${floor.value} from ${floor.source}`;
}

export async function validateTagVersionMatch(
  tag: string,
  packageJsonPath: string,
  options: {
    tagPrefix?: string;
    allowBuildMetadata?: boolean;
  } = {}
): Promise<{
  matched: boolean;
  tag: string;
  normalizedTag: string;
  version: string | null;
  packageJsonPath: string;
}> {
  const tagPrefix = options.tagPrefix ?? 'v';
  const allowBuildMetadata = options.allowBuildMetadata ?? true;
  const version = await readVersionFromPath(packageJsonPath);
  const normalizedTag = stripTag(tag, tagPrefix, allowBuildMetadata);

  if (!version) {
    return {
      matched: false,
      tag,
      normalizedTag,
      version: null,
      packageJsonPath
    };
  }

  const normalizedVersion = version.trim();
  const matched = allowBuildMetadata
    ? semver.valid(normalizedTag) !== null && semver.valid(normalizedVersion) !== null && semver.eq(normalizedTag, normalizedVersion)
    : normalizedTag === normalizedVersion;

  return {
    matched,
    tag,
    normalizedTag,
    version,
    packageJsonPath
  };
}

export async function runReleaseGuard(
  config: VersionConfig,
  options: ReleaseGuardOptions
): Promise<ReleaseGuardResult> {
  const guardConfig = config.releaseGuard || {};
  const tagPrefix = options.tagPrefix
    ?? (options.tagFormat ? deriveTagPrefixFromFormat(options.tagFormat) : undefined)
    ?? guardConfig.tagPrefix
    ?? 'v';
  const allowBuildMetadata = options.allowBuildMetadata ?? guardConfig.allowBuildMetadata ?? true;
  const checkReleaseFloor = options.checkReleaseFloor ?? guardConfig.checkReleaseFloor ?? true;
  const normalizedTag = stripTag(options.tag, tagPrefix, allowBuildMetadata);

  if (semver.valid(normalizedTag) === null) {
    throw new Error(`Release guard expected a semver tag, got "${options.tag}".`);
  }

  const targetResults = await collectTargetResults(config, options);
  const mismatches: string[] = [];

  for (const target of targetResults) {
    const result = await validateTagVersionMatch(options.tag, target.path, {
      tagPrefix,
      allowBuildMetadata
    });

    if (!result.matched) {
      mismatches.push(`${target.path}=${target.version}`);
    }
  }

  if (mismatches.length > 0) {
    const mismatchedTargets = targetResults.filter((target) => mismatches.includes(`${target.path}=${target.version}`));
    throw new Error(buildMismatchMessage(options.tag, tagPrefix, mismatchedTargets));
  }

  let floorCandidate: { value: string; source: string } | undefined;

  if (checkReleaseFloor) {
    const floorCandidates = targetResults
      .map((target) => ({
        value: target.version,
        source: target.path
      }))
      .filter((candidate) => semver.valid(candidate.value) !== null);

    const gitFloor = await loadGitReleaseFloor(tagPrefix);
    if (gitFloor) {
      floorCandidates.push(gitFloor);
    }

    if (floorCandidates.length > 0) {
      floorCandidate = floorCandidates
        .sort((left, right) => compareReleaseVersions(left.value, right.value))
        .at(-1);

      if (floorCandidate) {
        const comparison = compareReleaseVersions(normalizedTag, floorCandidate.value);
        if (comparison < 0) {
          throw new Error(buildFloorMessage(options.tag, floorCandidate));
        }
      }
    }
  }

  return {
    tag: options.tag,
    tagPrefix,
    normalizedTag,
    targetResults,
    floor: floorCandidate
  };
}