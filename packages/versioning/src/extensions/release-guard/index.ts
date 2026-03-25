import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { VersioningExtension } from '../../extensions';

export interface ReleaseGuardConfig {
  enabled?: boolean;
  /** Prefix expected before the semver string in a tag, e.g. "v" */
  tagPrefix?: string;
  /** Path to the package.json whose version field is the source of truth */
  packageJsonPath?: string;
  /** When true, build-metadata suffixes like +build.4 are stripped before comparison */
  allowBuildMetadata?: boolean;
  /** Additional package.json paths to validate in a monorepo */
  packages?: string[];
}

export interface GuardResult {
  valid: boolean;
  tag: string;
  packageVersion: string;
  packageJsonPath: string;
  message: string;
}

/**
 * Strip a tag prefix and any build-metadata suffix, then return the bare
 * semver string ready for comparison with package.json `version`.
 *
 * Examples:
 *   stripTag("v1.2.3",          "v", true)  => "1.2.3"
 *   stripTag("v1.2.3+build.4",  "v", true)  => "1.2.3"
 *   stripTag("v1.2.3+build.4",  "v", false) => "1.2.3+build.4"
 *   stripTag("1.2.3",           "",  true)  => "1.2.3"
 */
export function stripTag(
  tag: string,
  tagPrefix: string,
  allowBuildMetadata: boolean
): string {
  let version = tag;

  if (tagPrefix && version.startsWith(tagPrefix)) {
    version = version.slice(tagPrefix.length);
  }

  if (allowBuildMetadata) {
    const plusIdx = version.indexOf('+');
    if (plusIdx !== -1) {
      version = version.slice(0, plusIdx);
    }
  }

  return version;
}

/**
 * Read the `version` field from a package.json file.
 */
export async function readPackageVersion(pkgJsonPath: string): Promise<string> {
  if (!(await fs.pathExists(pkgJsonPath))) {
    throw new Error(`package.json not found: ${pkgJsonPath}`);
  }
  const pkg = await fs.readJson(pkgJsonPath);
  if (typeof pkg.version !== 'string' || !pkg.version) {
    throw new Error(`No valid "version" field found in ${pkgJsonPath}`);
  }
  return pkg.version;
}

/**
 * Validate that `tag` corresponds to the version recorded in `pkgJsonPath`.
 *
 * Returns a GuardResult describing whether validation passed and why.
 */
export async function validateTagVersionMatch(
  tag: string,
  pkgJsonPath: string,
  options: { tagPrefix?: string; allowBuildMetadata?: boolean } = {}
): Promise<GuardResult> {
  const tagPrefix = options.tagPrefix ?? 'v';
  const allowBuildMetadata = options.allowBuildMetadata ?? true;

  const packageVersion = await readPackageVersion(pkgJsonPath);
  const tagVersion = stripTag(tag, tagPrefix, allowBuildMetadata);

  const valid = tagVersion === packageVersion;

  return {
    valid,
    tag,
    packageVersion,
    packageJsonPath: pkgJsonPath,
    message: valid
      ? `✅ Tag "${tag}" matches package version "${packageVersion}" in ${pkgJsonPath}`
      : `❌ Tag "${tag}" (resolved: "${tagVersion}") does not match package version "${packageVersion}" in ${pkgJsonPath}`
  };
}

/**
 * Run the full guard across all configured package.json paths.
 * Throws if any mismatch is detected.
 */
export async function runReleaseGuard(
  tag: string,
  guardConfig: ReleaseGuardConfig
): Promise<void> {
  const tagPrefix = guardConfig.tagPrefix ?? 'v';
  const allowBuildMetadata = guardConfig.allowBuildMetadata ?? true;

  const targets: string[] = [
    guardConfig.packageJsonPath ?? 'package.json',
    ...(guardConfig.packages ?? [])
  ];

  const failures: string[] = [];

  for (const pkgPath of targets) {
    const result = await validateTagVersionMatch(tag, pkgPath, {
      tagPrefix,
      allowBuildMetadata
    });

    console.log(result.message);

    if (!result.valid) {
      failures.push(result.message);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Release guard failed: tag/version mismatch detected.\n` +
        failures.join('\n')
    );
  }
}

const extension: VersioningExtension = {
  name: 'release-guard',
  description:
    'Guards the release flow by verifying that the release tag matches the package.json version',
  version: '1.0.0',

  hooks: {
    preRelease: async (version: string, options: any) => {
      const config: ReleaseGuardConfig =
        options?.extensionConfig?.['release-guard'] ?? {};

      if (config.enabled === false) {
        return;
      }

      const tagPrefix = config.tagPrefix ?? 'v';
      const tag = `${tagPrefix}${version}`;

      await runReleaseGuard(tag, config);
    }
  },

  register: async (program: Command, config: any) => {
    const guardConfig: ReleaseGuardConfig =
      config?.extensionConfig?.['release-guard'] ?? {};

    if (guardConfig.enabled === false) {
      return;
    }

    program
      .command('guard-tag')
      .description(
        'Verify that a release tag matches the resolved package.json version'
      )
      .requiredOption('-t, --tag <tag>', 'Release tag to validate (e.g. v1.2.3)')
      .option(
        '--tag-prefix <prefix>',
        'Prefix used in the tag before the semver string',
        guardConfig.tagPrefix ?? 'v'
      )
      .option(
        '--package-json <path>',
        'Path to the package.json to validate against',
        guardConfig.packageJsonPath ?? 'package.json'
      )
      .option(
        '--allow-build-metadata',
        'Strip +build.N suffixes before comparing'
      )
      .option(
        '--packages <paths>',
        'Comma-separated additional package.json paths (monorepo)',
        (val: string) => val.split(',').map(p => p.trim())
      )
      .action(async (opts) => {
        try {
          const mergedConfig: ReleaseGuardConfig = {
            tagPrefix: opts.tagPrefix,
            packageJsonPath: opts.packageJson,
            allowBuildMetadata: opts.allowBuildMetadata ?? guardConfig.allowBuildMetadata ?? true,
            packages: opts.packages ?? guardConfig.packages ?? []
          };

          await runReleaseGuard(opts.tag, mergedConfig);
          console.log('✅ Release guard passed.');
        } catch (error) {
          console.error(
            '❌ Release guard failed:',
            error instanceof Error ? error.message : String(error)
          );
          process.exit(1);
        }
      });
  }
};

export default extension;
