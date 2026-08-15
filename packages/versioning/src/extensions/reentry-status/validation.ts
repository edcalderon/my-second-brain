import * as fs from 'fs-extra';
import * as path from 'path';

import { ConfigManager } from './config-manager';
import { StatusRenderer } from './status-renderer';

export interface ReentryValidationResult {
  ok: boolean;
  errors: string[];
  jsonPath: string;
  markdownPath: string;
}

export async function validateReentryFiles(
  rootConfig: any,
  project?: string
): Promise<ReentryValidationResult> {
  const reentryConfig = ConfigManager.loadConfig(rootConfig, project);
  const jsonPath = path.resolve(reentryConfig.files.jsonPath);
  const markdownPath = path.resolve(reentryConfig.files.markdownPath);
  const errors: string[] = [];

  if (!(await fs.pathExists(jsonPath))) {
    errors.push(`Missing reentry status: ${path.relative(process.cwd(), jsonPath).split(path.sep).join('/')}`);
    return { ok: false, errors, jsonPath, markdownPath };
  }

  if (!(await fs.pathExists(markdownPath))) {
    errors.push(`Missing REENTRY markdown: ${path.relative(process.cwd(), markdownPath).split(path.sep).join('/')}`);
    return { ok: false, errors, jsonPath, markdownPath };
  }

  try {
    const rawJson = await fs.readFile(jsonPath, 'utf8');
    const status = StatusRenderer.parseJson(rawJson);
    const expectedJson = StatusRenderer.renderJson(status);
    const expectedMarkdown = StatusRenderer.renderMarkdown(status);
    const actualMarkdown = await fs.readFile(markdownPath, 'utf8');

    if (rawJson.replace(/\r\n/g, '\n') !== expectedJson.replace(/\r\n/g, '\n')) {
      errors.push(`Stale reentry status: ${path.relative(process.cwd(), jsonPath).split(path.sep).join('/')}`);
    }

    if (actualMarkdown.replace(/\r\n/g, '\n') !== expectedMarkdown.replace(/\r\n/g, '\n')) {
      errors.push(`Stale REENTRY markdown: ${path.relative(process.cwd(), markdownPath).split(path.sep).join('/')}`);
    }
  } catch (error) {
    errors.push(`Unable to validate reentry files: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    jsonPath,
    markdownPath
  };
}
