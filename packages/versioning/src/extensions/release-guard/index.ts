import { Command } from 'commander';
import { VersioningExtension } from '../../extensions';
import { ReleaseGuardOptions, runReleaseGuard } from '../../release-guard';
import type { VersionConfig } from '../../versioning';

interface ReleaseGuardExtensionConfig {
  enabled?: boolean;
  tagPrefix?: string;
  packageJsonPath?: string;
  allowBuildMetadata?: boolean;
  packages?: string[];
  metadataFiles?: string[];
  checkReleaseFloor?: boolean;
}

function parseList(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : undefined;
}

function resolveReleaseGuardConfig(config: any): ReleaseGuardExtensionConfig {
  return {
    ...(config?.releaseGuard || {}),
    ...(config?.extensionConfig?.['release-guard'] || {})
  };
}

function buildRuntimeConfig(
  config: any,
  guardConfig: ReleaseGuardExtensionConfig,
  overrides: {
    tag?: string;
    tagPrefix?: string;
    packageJsonPath?: string;
    packages?: string[];
    metadataFiles?: string[];
    allowBuildMetadata?: boolean;
    checkReleaseFloor?: boolean;
  } = {}
): { versionConfig: VersionConfig; guardOptions: ReleaseGuardOptions } {
  const rootPackageJson = overrides.packageJsonPath
    ?? guardConfig.packageJsonPath
    ?? config.rootPackageJson
    ?? 'package.json';
  const packages = overrides.packages
    ?? guardConfig.packages
    ?? config.packages
    ?? [];
  const metadataFiles = overrides.metadataFiles
    ?? guardConfig.metadataFiles
    ?? config.releaseGuard?.metadataFiles
    ?? [];
  const tagPrefix = overrides.tagPrefix
    ?? guardConfig.tagPrefix
    ?? config.releaseGuard?.tagPrefix
    ?? 'v';
  const allowBuildMetadata = overrides.allowBuildMetadata
    ?? guardConfig.allowBuildMetadata
    ?? config.releaseGuard?.allowBuildMetadata
    ?? true;
  const checkReleaseFloor = overrides.checkReleaseFloor
    ?? guardConfig.checkReleaseFloor
    ?? config.releaseGuard?.checkReleaseFloor
    ?? true;

  return {
    versionConfig: {
      rootPackageJson,
      packages,
      releaseGuard: {
        enabled: guardConfig.enabled !== false,
        tagPrefix,
        allowBuildMetadata,
        checkReleaseFloor,
        metadataFiles
      }
    },
    guardOptions: {
      tag: overrides.tag || '',
      tagPrefix,
      packages,
      metadataFiles,
      allowBuildMetadata,
      checkReleaseFloor
    }
  };
}

const extension: VersioningExtension = {
  name: 'release-guard',
  description: 'Validates release tags against tracked package versions before a release is published',
  version: '1.0.0',

  hooks: {
    preRelease: async (version: string, options: any) => {
      const guardConfig = resolveReleaseGuardConfig(options?.config || options || {});

      if (guardConfig.enabled === false) {
        return;
      }

      const runtime = buildRuntimeConfig(options?.config || options || {}, guardConfig, {
        tag: `${guardConfig.tagPrefix || 'v'}${version}`,
        tagPrefix: guardConfig.tagPrefix,
        packageJsonPath: guardConfig.packageJsonPath,
        packages: guardConfig.packages,
        metadataFiles: guardConfig.metadataFiles,
        allowBuildMetadata: guardConfig.allowBuildMetadata,
        checkReleaseFloor: guardConfig.checkReleaseFloor
      });

      await runReleaseGuard(runtime.versionConfig, runtime.guardOptions);
    }
  },

  register: async (program: Command, config: any) => {
    const guardConfig = resolveReleaseGuardConfig(config);
    program
      .command('guard-tag')
      .description('Validate that a release tag matches the current package versions and release floor')
      .requiredOption('-t, --tag <tag>', 'release tag to validate')
      .option('--tag-prefix <prefix>', 'tag prefix to strip before comparing', guardConfig.tagPrefix || 'v')
      .option('--package-json <path>', 'package.json file to validate against', guardConfig.packageJsonPath || config.rootPackageJson || 'package.json')
      .option('--allow-build-metadata', 'allow build metadata tags such as v1.2.3+build.4', guardConfig.allowBuildMetadata ?? true)
      .option('--no-floor', 'skip release floor validation')
      .option('-p, --packages <packages>', 'comma-separated list of package directories or package.json paths to validate')
      .option('--metadata-files <files>', 'comma-separated list of extra release metadata files to validate')
      .action(async (options) => {
        try {
          const runtime = buildRuntimeConfig(config, guardConfig, {
            tag: options.tag,
            tagPrefix: options.tagPrefix,
            packageJsonPath: options.packageJson,
            packages: parseList(options.packages),
            metadataFiles: parseList(options.metadataFiles),
            allowBuildMetadata: options.allowBuildMetadata !== false,
            checkReleaseFloor: options.floor !== false
          });

          const result = await runReleaseGuard(runtime.versionConfig, runtime.guardOptions);

          console.log(`✅ Release tag ${result.tag} matches tracked versions.`);
          if (result.floor) {
            console.log(`🏁 Release floor: ${result.floor.value} (${result.floor.source})`);
          }
        } catch (error) {
          console.error('❌ Release guard failed:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });
  }
};

export default extension;