import { Command } from 'commander';
import { VersioningExtension } from '../../extensions';
import { runReleaseGuard } from '../../release-guard';

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

const extension: VersioningExtension = {
  name: 'release-guard',
  description: 'Validates release tags against tracked package versions before a release is published',
  version: '1.0.0',

  register: async (program: Command, config: any) => {
    program
      .command('guard-tag')
      .description('Validate that a release tag matches the current package versions and release floor')
      .requiredOption('--tag <tag>', 'release tag to validate')
      .option('--tag-prefix <prefix>', 'tag prefix to strip before comparing', config.releaseGuard?.tagPrefix || 'v')
      .option('--allow-build-metadata', 'allow build metadata tags such as v1.2.3+build.4', true)
      .option('--no-floor', 'skip release floor validation')
      .option('-p, --packages <packages>', 'comma-separated list of package directories to validate')
      .option('--metadata-files <files>', 'comma-separated list of extra release metadata files to validate')
      .action(async (options) => {
        try {
          const guardConfig = config.releaseGuard || {};
          const result = await runReleaseGuard(config, {
            tag: options.tag,
            tagPrefix: options.tagPrefix,
            packages: parseList(options.packages),
            metadataFiles: parseList(options.metadataFiles) ?? guardConfig.metadataFiles,
            allowBuildMetadata: options.allowBuildMetadata !== false,
            checkReleaseFloor: options.floor !== false
          });

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