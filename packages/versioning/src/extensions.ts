import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface VersioningExtension {
  name: string;
  description: string;
  version: string;
  register: (program: Command, config: any) => void | Promise<void>;
  hooks?: ExtensionHooks;
}

export interface ExtensionHooks {
  preVersion?: (type: string, options: any) => void | Promise<void>;
  postVersion?: (type: string, version: string, options: any) => void | Promise<void>;
  preRelease?: (version: string, options: any) => void | Promise<void>;
  postRelease?: (version: string, options: any) => void | Promise<void>;
  preChangelog?: (options: any) => void | Promise<void>;
  postChangelog?: (options: any) => void | Promise<void>;
  preSync?: (options: any) => void | Promise<void>;
  postSync?: (options: any) => void | Promise<void>;
}

export interface ExtensionContext {
  config: any;
  versionManager?: any;
  changelogManager?: any;
  syncManager?: any;
  releaseManager?: any;
  hooks: ExtensionHooks[];
}

let globalExtensionContext: ExtensionContext | null = null;

export function getExtensionContext(): ExtensionContext | null {
  return globalExtensionContext;
}

export async function initializeExtensionContext(config: any): Promise<ExtensionContext> {
  globalExtensionContext = {
    config,
    hooks: []
  };
  return globalExtensionContext;
}

export async function runExtensionHooks(hookName: keyof ExtensionHooks, ...args: any[]): Promise<void> {
  if (!globalExtensionContext) return;

  for (const extensionHooks of globalExtensionContext.hooks) {
    const hook = extensionHooks[hookName];
    if (hook) {
      try {
        await (hook as any)(...args);
      } catch (error) {
        console.warn(`⚠️  Extension hook ${hookName} failed:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
}

export async function loadExtensions(program: Command): Promise<void> {
  try {
    // Try to load config to get extensions list
    let config: any = {};
    if (await fs.pathExists('versioning.config.json')) {
      config = await fs.readJson('versioning.config.json');
    }

    // Initialize extension context
    const context = await initializeExtensionContext(config);

    const extensions = config.extensions || [];

    // Load built-in extensions from local extensions directory
    const extensionsDir = path.join(__dirname, 'extensions');
    if (await fs.pathExists(extensionsDir)) {
      const extensionFiles = await fs.readdir(extensionsDir);
      for (const file of extensionFiles) {
        let extensionPath = path.join(extensionsDir, file);
        const stats = await fs.stat(extensionPath);

        if (stats.isDirectory()) {
          // Check for index.js in directory
          const indexPath = path.join(extensionPath, 'index.js');
          if (await fs.pathExists(indexPath)) {
            extensionPath = indexPath;
          } else {
            continue;
          }
        } else if (!file.endsWith('.js')) {
          continue;
        }

        try {
          const extensionModule = require(extensionPath);
          const extension: VersioningExtension = extensionModule.default || extensionModule;

          if (extension && typeof extension.register === 'function') {
            await extension.register(program, config);

            // Register hooks if available
            if (extension.hooks) {
              context.hooks.push(extension.hooks);
            }

            console.log(`✅ Loaded extension: ${extension.name}@${extension.version}`);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to load extension ${file}:`, error instanceof Error ? error.message : String(error));
        }
      }
    }

    // Note: External extensions from config.extensions are not yet implemented
    // This would require a package manager to install and load external extensions

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

          // Register hooks if available
          if (extension.hooks) {
            context.hooks.push(extension.hooks);
          }

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
    hooks: []
    // Managers will be injected when available
  };
}