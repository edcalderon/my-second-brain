import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface VersioningExtension {
  name: string;
  description: string;
  version: string;
  register: (program: Command, config: any) => void | Promise<void>;
}

export interface ExtensionContext {
  config: any;
  versionManager?: any;
  changelogManager?: any;
  syncManager?: any;
  releaseManager?: any;
}

export async function loadExtensions(program: Command): Promise<void> {
  try {
    // Try to load config to get extensions list
    let config: any = {};
    if (await fs.pathExists('versioning.config.json')) {
      config = await fs.readJson('versioning.config.json');
    }

    const extensions = config.extensions || [];

    // Load built-in extensions from local extensions directory
    const extensionsDir = path.join(__dirname, 'extensions');
    if (await fs.pathExists(extensionsDir)) {
      const extensionFiles = await fs.readdir(extensionsDir);
      for (const file of extensionFiles) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          try {
            const extensionPath = path.join(extensionsDir, file);
            const extension: VersioningExtension = require(extensionPath);

            if (extension && typeof extension.register === 'function') {
              await extension.register(program, config);
              console.log(`✅ Loaded extension: ${extension.name}@${extension.version}`);
            }
          } catch (error) {
            console.warn(`⚠️  Failed to load extension ${file}:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
    }

    // Load external extensions from node_modules or specified paths
    for (const extConfig of extensions) {
      try {
        let extension: VersioningExtension;

        if (typeof extConfig === 'string') {
          // Load from node_modules
          extension = require(extConfig);
        } else if (extConfig.path) {
          // Load from custom path
          extension = require(path.resolve(extConfig.path));
        } else {
          continue;
        }

        if (extension && typeof extension.register === 'function') {
          await extension.register(program, config);
          console.log(`✅ Loaded external extension: ${extension.name}@${extension.version}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to load external extension:`, error instanceof Error ? error.message : String(error));
      }
    }

  } catch (error) {
    // Don't fail if extensions can't be loaded, just warn
    console.warn('⚠️  Could not load extensions:', error instanceof Error ? error.message : String(error));
  }
}

export function createExtensionContext(config: any): ExtensionContext {
  return {
    config,
    // Managers will be injected when available
  };
}