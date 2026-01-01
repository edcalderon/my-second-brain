import { Command } from 'commander';
import { VersioningExtension } from '../extensions';

const extension: VersioningExtension = {
  name: 'lifecycle-hooks',
  description: 'Extension demonstrating lifecycle hooks for versioning process',
  version: '1.0.0',

  hooks: {
    preVersion: async (type: string, options: any) => {
      console.log(`🔗 Pre-version hook: Preparing for ${type} release...`);
      console.log('📋 Running pre-flight checks...');
      console.log('🔍 Validating environment...');
      console.log('📊 Gathering metrics...');
    },

    postVersion: async (type: string, version: string, options: any) => {
      console.log(`🔗 Post-version hook: ${type} release ${version} completed!`);
      console.log('📈 Updating dashboards...');
      console.log('🔄 Triggering CI/CD pipelines...');
      console.log('📝 Creating release notes...');
    },

    preChangelog: async (options: any) => {
      console.log('🔗 Pre-changelog hook: Preparing changelog generation...');
      console.log('📚 Analyzing commits...');
    },

    postChangelog: async (options: any) => {
      console.log('🔗 Post-changelog hook: Changelog updated!');
      console.log('📤 Changelog ready for review...');
    },

    preSync: async (options: any) => {
      console.log('🔗 Pre-sync hook: Preparing version synchronization...');
      console.log('🔗 Checking package dependencies...');
    },

    postSync: async (options: any) => {
      console.log('🔗 Post-sync hook: Version sync completed!');
      console.log('✅ All packages aligned...');
    }
  },

  register: async (program: Command, config: any) => {
    // Add a command to demonstrate hook management
    program
      .command('hooks')
      .description('Manage versioning lifecycle hooks (sample extension)')
      .addCommand(
        new Command('list')
          .description('List available hooks')
          .action(() => {
            console.log('🔗 Available Lifecycle Hooks:');
            console.log('  • preVersion: Runs before version bump');
            console.log('  • postVersion: Runs after version bump');
            console.log('  • preRelease: Runs before release creation');
            console.log('  • postRelease: Runs after release creation');
            console.log('  • preChangelog: Runs before changelog generation');
            console.log('  • postChangelog: Runs after changelog generation');
            console.log('  • preSync: Runs before version sync');
            console.log('  • postSync: Runs after version sync');
          })
      )
      .addCommand(
        new Command('run')
          .description('Manually run a hook')
          .argument('<hook>', 'Hook name to run')
          .option('-d, --data <data>', 'Data to pass to hook')
          .action(async (hookName, options) => {
            console.log(`🔗 Running hook: ${hookName}`);
            // This would be implemented to manually trigger hooks
            console.log(`📄 Hook data: ${options.data || 'none'}`);
          })
      );
  }
};

export default extension;