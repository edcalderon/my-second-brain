import * as fsExtra from 'fs-extra';
import * as path from 'path';

import { ReentryStatus } from './models';
import { ConfigManager } from './config-manager';
import { StatusRenderer } from './status-renderer';

export interface FileSystem {
  pathExists(filePath: string): Promise<boolean>;
  ensureDir(dirPath: string): Promise<void>;
  readFile(filePath: string, encoding: 'utf8'): Promise<string>;
  writeFile(filePath: string, content: string, encoding: 'utf8'): Promise<void>;
  move(src: string, dest: string, options: { overwrite: boolean }): Promise<void>;
  remove(filePath: string): Promise<void>;
}

export class FileManager {
  constructor(private readonly fs: FileSystem = fsExtra) {}

  async ensureDirForFile(filePath: string): Promise<void> {
    await this.fs.ensureDir(path.dirname(filePath));
  }

  async readFileIfExists(filePath: string): Promise<string | null> {
    if (!(await this.fs.pathExists(filePath))) return null;
    return await this.fs.readFile(filePath, 'utf8');
  }

  async writeFileIfChanged(filePath: string, content: string): Promise<boolean> {
    const prev = await this.readFileIfExists(filePath);
    if (prev !== null && prev.replace(/\r\n/g, '\n') === content.replace(/\r\n/g, '\n')) {
      return false;
    }

    await this.ensureDirForFile(filePath);

    const tmpPath = `${filePath}.tmp`;
    await this.fs.writeFile(tmpPath, content, 'utf8');
    await this.fs.move(tmpPath, filePath, { overwrite: true });
    return true;
  }

  /**
   * Writes both JSON and Markdown status files as a single operation.
   * Best-effort atomicity: either both are updated, or any partial update is rolled back.
   */
  async writeStatusFiles(config: any, status: ReentryStatus): Promise<{ changed: boolean }> {
    const reentryConfig = ConfigManager.loadConfig(config);
    const jsonPath = reentryConfig.files.jsonPath;
    const markdownPath = reentryConfig.files.markdownPath;

    const nextJson = StatusRenderer.renderJson(status);
    const nextMarkdown = StatusRenderer.renderMarkdown(status);

    const prevJson = await this.readFileIfExists(jsonPath);
    const prevMarkdown = await this.readFileIfExists(markdownPath);

    const jsonSame = prevJson !== null && prevJson.replace(/\r\n/g, '\n') === nextJson.replace(/\r\n/g, '\n');
    const mdSame = prevMarkdown !== null && prevMarkdown.replace(/\r\n/g, '\n') === nextMarkdown.replace(/\r\n/g, '\n');

    if (jsonSame && mdSame) return { changed: false };

    await this.ensureDirForFile(jsonPath);
    await this.ensureDirForFile(markdownPath);

    const jsonTmp = `${jsonPath}.tmp`;
    const mdTmp = `${markdownPath}.tmp`;

    // Stage temp files first.
    await this.fs.writeFile(jsonTmp, nextJson, 'utf8');
    await this.fs.writeFile(mdTmp, nextMarkdown, 'utf8');

    let jsonMoved = false;
    try {
      await this.fs.move(jsonTmp, jsonPath, { overwrite: true });
      jsonMoved = true;

      await this.fs.move(mdTmp, markdownPath, { overwrite: true });

      return { changed: true };
    } catch (error) {
      // Clean up temp files (ignore errors).
      try {
        if (await this.fs.pathExists(jsonTmp)) await this.fs.remove(jsonTmp);
      } catch {}
      try {
        if (await this.fs.pathExists(mdTmp)) await this.fs.remove(mdTmp);
      } catch {}

      // Roll back JSON if it was moved but Markdown wasn't.
      if (jsonMoved) {
        try {
          if (prevJson === null) {
            await this.fs.remove(jsonPath);
          } else {
            const rollbackTmp = `${jsonPath}.rollback.tmp`;
            await this.fs.writeFile(rollbackTmp, prevJson, 'utf8');
            await this.fs.move(rollbackTmp, jsonPath, { overwrite: true });
          }
        } catch {
          // If rollback fails, rethrow original error.
        }
      }

      throw error;
    }
  }

  async loadStatus(config: any): Promise<ReentryStatus | null> {
    const reentryConfig = ConfigManager.loadConfig(config);
    const jsonContent = await this.readFileIfExists(reentryConfig.files.jsonPath);
    if (!jsonContent) return null;
    return StatusRenderer.parseJson(jsonContent);
  }

  async writeStatusJson(config: any, status: ReentryStatus): Promise<boolean> {
    const reentryConfig = ConfigManager.loadConfig(config);
    const json = StatusRenderer.renderJson(status);
    return await this.writeFileIfChanged(reentryConfig.files.jsonPath, json);
  }

  async writeReentryMarkdown(config: any, status: ReentryStatus): Promise<boolean> {
    const reentryConfig = ConfigManager.loadConfig(config);
    const md = StatusRenderer.renderMarkdown(status);
    return await this.writeFileIfChanged(reentryConfig.files.markdownPath, md);
  }
}
