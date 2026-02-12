import { spawn } from 'child_process';
import * as path from 'path';

import { ObsidianClient, ObsidianNote } from './obsidian-sync-adapter';

function escapeCliValue(value: string): string {
  // Obsidian CLI expects newlines escaped as \n.
  return value.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');
}

async function runObsidian(args: string[], cwd?: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn('obsidian', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += String(d)));
    child.stderr.on('data', (d) => (stderr += String(d)));

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`obsidian CLI failed (code ${code}): ${stderr || stdout}`));
    });
  });
}

export class ObsidianCliClient implements ObsidianClient {
  async getNote(params: { vaultPath: string; notePath: string }): Promise<ObsidianNote | null> {
    const cwd = params.vaultPath;
    const notePath = params.notePath;

    try {
      const output = await runObsidian([`read`, `path=${notePath}`], cwd);
      // CLI prints the file contents.
      return { path: notePath, content: output };
    } catch {
      return null;
    }
  }

  async upsertNote(params: { vaultPath: string; notePath: string; content: string }): Promise<ObsidianNote> {
    const cwd = params.vaultPath;
    const notePath = params.notePath;

    // Obsidian CLI `create` can overwrite with the `overwrite` flag.
    const content = escapeCliValue(params.content);

    await runObsidian([`create`, `path=${notePath}`, `content=${content}`, 'overwrite', 'silent'], cwd);
    return { path: notePath, content: params.content };
  }

  static async isAvailable(): Promise<boolean> {
    try {
      await runObsidian(['version']);
      return true;
    } catch {
      return false;
    }
  }

  static normalizeVaultPath(vaultPath: string): string {
    return path.resolve(vaultPath);
  }
}
