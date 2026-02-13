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

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T[K] extends object
  ? DeepPartial<T[K]>
  : T[K];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function defaultFilesConfig(): ReentryStatusConfig['files'] {
  return {
    jsonPath: path.join(REENTRY_STATUS_DIRNAME, REENTRY_STATUS_JSON_FILENAME),
    markdownPath: path.join(REENTRY_STATUS_DIRNAME, REENTRY_STATUS_MD_FILENAME)
  };
}

export function canonicalProjectKey(project?: string): string | undefined {
  const raw = typeof project === 'string' ? project.trim() : '';
  if (!raw) return undefined;

  // Prefer the last segment for scoped package names (e.g. "@ed/trader" -> "trader").
  if (raw.startsWith('@') && raw.includes('/')) {
    const parts = raw.split('/').filter(Boolean);
    const last = parts[parts.length - 1]?.trim();
    return last || undefined;
  }

  // Also handle path-like inputs (e.g. "apps/trader" -> "trader").
  if (raw.includes('/')) {
    const parts = raw.split('/').filter(Boolean);
    const last = parts[parts.length - 1]?.trim();
    return last || undefined;
  }

  return raw;
}

function toProjectDir(project?: string): string {
  const raw = canonicalProjectKey(project) ?? '';
  if (!raw) return REENTRY_STATUS_DIRNAME;

  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return path.join(REENTRY_STATUS_DIRNAME, 'projects', safe || 'project');
}

function defaultFilesConfigForProject(project?: string): ReentryStatusConfig['files'] {
  const dir = toProjectDir(project);
  return {
    jsonPath: path.join(dir, REENTRY_STATUS_JSON_FILENAME),
    markdownPath: path.join(dir, REENTRY_STATUS_MD_FILENAME),
  };
}

export class ConfigManager {
  static loadConfig(rootConfig: any, project?: string): ReentryStatusConfig {
    const canonicalProject = canonicalProjectKey(project);

    // Try new extensionConfig location first, then fallback to root-level property
    const extensionConfig = rootConfig?.extensionConfig?.['reentry-status'];
    const raw = (extensionConfig ?? (rootConfig && typeof rootConfig === 'object' ? (rootConfig as any).reentryStatus : undefined)) as
      | (DeepPartial<ReentryStatusConfig> & { projects?: Record<string, DeepPartial<ReentryStatusConfig>> })
      | undefined;

    const basePartial: DeepPartial<ReentryStatusConfig> = { ...(raw ?? {}) };
    delete (basePartial as any).projects;

    const projectPartial: DeepPartial<ReentryStatusConfig> | undefined =
      canonicalProject && raw && typeof raw === 'object' && (raw as any).projects && typeof (raw as any).projects === 'object'
        ? (raw as any).projects[String(canonicalProject)] ?? (raw as any).projects[String(project)]
        : undefined;

    if (!projectPartial) {
      return ConfigManager.mergeWithDefaults(basePartial, canonicalProject);
    }

    const merged: DeepPartial<ReentryStatusConfig> = {
      ...basePartial,
      ...projectPartial,
      hooks: {
        ...basePartial.hooks,
        ...projectPartial.hooks,
      },
      files: {
        ...basePartial.files,
        ...projectPartial.files,
      },
      template: projectPartial.template
        ? {
          includeSections: projectPartial.template.includeSections ?? basePartial.template?.includeSections ?? [],
          excludeSections: projectPartial.template.excludeSections ?? basePartial.template?.excludeSections ?? [],
          customSections: projectPartial.template.customSections ?? basePartial.template?.customSections,
        }
        : basePartial.template,
      github: (projectPartial as any).github ?? (basePartial as any).github,
      obsidian: (projectPartial as any).obsidian ?? (basePartial as any).obsidian,
    };

    return ConfigManager.mergeWithDefaults(merged, canonicalProject);
  }

  static mergeWithDefaults(partial: DeepPartial<ReentryStatusConfig>, project?: string): ReentryStatusConfig {
    const defaults = defaultFilesConfigForProject(project);

    const merged: ReentryStatusConfig = {
      enabled: partial.enabled ?? true,
      autoSync: partial.autoSync ?? true,
      failHard: partial.failHard ?? false,

      hooks: {
        postVersion: partial.hooks?.postVersion ?? true,
        postRelease: partial.hooks?.postRelease ?? false
      },

      files: {
        jsonPath: partial.files?.jsonPath ?? defaults.jsonPath,
        markdownPath: partial.files?.markdownPath ?? defaults.markdownPath
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
