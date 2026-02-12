import * as path from 'path';

import {
  GitHubConfig,
  ObsidianConfig,
  ReentryStatusConfig,
  SyncTarget
} from './models';
import {
  REENTRY_STATUS_DIRNAME,
  REENTRY_STATUS_JSON_FILENAME,
  REENTRY_STATUS_MD_FILENAME
} from './constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function defaultFilesConfig(): ReentryStatusConfig['files'] {
  return {
    jsonPath: path.join(REENTRY_STATUS_DIRNAME, REENTRY_STATUS_JSON_FILENAME),
    markdownPath: path.join(REENTRY_STATUS_DIRNAME, REENTRY_STATUS_MD_FILENAME)
  };
}

export class ConfigManager {
  static loadConfig(rootConfig: any): ReentryStatusConfig {
    const partial = (rootConfig && typeof rootConfig === 'object' ? rootConfig.reentryStatus : undefined) as
      | Partial<ReentryStatusConfig>
      | undefined;

    return ConfigManager.mergeWithDefaults(partial ?? {});
  }

  static mergeWithDefaults(partial: Partial<ReentryStatusConfig>): ReentryStatusConfig {
    const merged: ReentryStatusConfig = {
      enabled: partial.enabled ?? true,
      autoSync: partial.autoSync ?? true,
      failHard: partial.failHard ?? false,

      hooks: {
        postVersion: partial.hooks?.postVersion ?? true,
        postRelease: partial.hooks?.postRelease ?? false
      },

      files: {
        jsonPath: partial.files?.jsonPath ?? defaultFilesConfig().jsonPath,
        markdownPath: partial.files?.markdownPath ?? defaultFilesConfig().markdownPath
      },

      github: partial.github as GitHubConfig | undefined,
      obsidian: partial.obsidian as ObsidianConfig | undefined,
      template: partial.template
        ? {
            includeSections: partial.template.includeSections ?? [],
            excludeSections: partial.template.excludeSections ?? [],
            customSections: partial.template.customSections
          }
        : undefined
    };

    return merged;
  }

  static validateConfig(config: ReentryStatusConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.files || !isNonEmptyString(config.files.jsonPath) || !isNonEmptyString(config.files.markdownPath)) {
      errors.push('files.jsonPath and files.markdownPath must be non-empty strings');
    }

    if (config.github?.enabled) {
      if (!isNonEmptyString(config.github.owner)) errors.push('github.owner is required when github.enabled is true');
      if (!isNonEmptyString(config.github.repo)) errors.push('github.repo is required when github.enabled is true');

      if (!config.github.issue || !isNonEmptyString(config.github.issue.title)) {
        errors.push('github.issue.title is required when github.enabled is true');
      }
      if (!config.github.issue || !Array.isArray(config.github.issue.labels)) {
        errors.push('github.issue.labels must be an array when github.enabled is true');
      }

      if (!config.github.auth || !isNonEmptyString(config.github.auth.token)) {
        errors.push('github.auth.token is required when github.enabled is true');
      }
    }

    if (config.obsidian?.enabled) {
      if (!isNonEmptyString(config.obsidian.vaultPath)) {
        errors.push('obsidian.vaultPath is required when obsidian.enabled is true');
      }
      if (!isNonEmptyString(config.obsidian.notePath)) {
        errors.push('obsidian.notePath is required when obsidian.enabled is true');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  static getSyncTargets(config: ReentryStatusConfig): SyncTarget[] {
    if (!config.enabled) return [];

    const targets: SyncTarget[] = ['files'];
    if (config.github?.enabled) targets.push('github');
    if (config.obsidian?.enabled) targets.push('obsidian');
    return targets;
  }
}
