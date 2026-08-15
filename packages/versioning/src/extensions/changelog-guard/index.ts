import { Command } from 'commander';

import { checkChangelogFile } from '../../changelog-guard';
import { VersioningExtension } from '../../extensions';

const extension: VersioningExtension = {
  name: 'changelog-guard',
  description: 'Validate changelog release entries before release',
  version: '1.0.0',

  register: async (program: Command) => {
    program
      .command('check-changelog')
      .description('Check that the latest or specified changelog entry contains documented changes')
      .option('--changelog <file>', 'Path to the changelog file', 'CHANGELOG.md')
      .option('--version <semver>', 'Check a specific release version')
      .option('--allow-empty', 'Allow empty release entries', false)
      .action(async (options) => {
        try {
          const result = await checkChangelogFile({
            changelogPath: options.changelog,
            version: options.version,
            allowEmpty: Boolean(options.allowEmpty)
          });

          if (!result.ok) {
            console.error(`❌ ${result.reason ?? 'Changelog validation failed'}`);
            process.exit(1);
          }

          console.log(`✅ Changelog entry ${result.version ?? 'latest'} is valid`);
        } catch (error) {
          console.error('❌ Changelog validation failed:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });
  }
};

export default extension;
