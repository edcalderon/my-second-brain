import { Command } from 'commander';
import { VersioningExtension } from '../extensions';

const extension: VersioningExtension = {
  name: 'sample-extension',
  description: 'Sample extension demonstrating custom business logic',
  version: '1.0.0',

  register: async (program: Command, config: any) => {
    // Add a custom command
    program
      .command('deploy')
      .description('Deploy application after versioning (sample extension)')
      .option('-e, --environment <env>', 'Deployment environment', 'staging')
      .option('-c, --config <file>', 'Config file path', 'versioning.config.json')
      .action(async (options) => {
        try {
          console.log(`🚀 Deploying to ${options.environment} environment...`);

          // Custom deployment logic here
          console.log('📦 Building application...');
          console.log('🔄 Running tests...');
          console.log('☁️  Deploying to cloud...');
          console.log('✅ Deployment completed!');

          console.log(`🎉 Successfully deployed to ${options.environment}`);
        } catch (error) {
          console.error('❌ Deployment failed:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });

    // Add another custom command
    program
      .command('notify')
      .description('Send notifications after versioning (sample extension)')
      .option('-m, --message <msg>', 'Notification message')
      .option('-c, --channels <channels>', 'Comma-separated notification channels', 'slack,email')
      .action(async (options) => {
        try {
          const channels = options.channels.split(',');
          const message = options.message || 'Version update completed';

          console.log(`📢 Sending notification: "${message}"`);

          for (const channel of channels) {
            console.log(`📤 Notifying ${channel}...`);
            // Custom notification logic here
          }

          console.log('✅ Notifications sent!');
        } catch (error) {
          console.error('❌ Notification failed:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });
  }
};

export default extension;