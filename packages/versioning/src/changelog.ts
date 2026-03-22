import * as fs from 'fs-extra';
import * as path from 'path';
import conventionalChangelog from 'conventional-changelog';

export interface ChangelogConfig {
  preset?: string;
  infile?: string;
  outfile?: string;
  releaseCount?: number;
  sameFile?: boolean;
  tagPrefix?: string;
  path?: string;
}

export class ChangelogManager {
  private config: ChangelogConfig;

  constructor(config: any = {}) {
    const cwd = process.cwd();
    let computedPath = config.changelog?.path || config.path;
    
    if (!computedPath && fs.existsSync(path.join(cwd, '.git'))) {
      computedPath = '.';
    } else if (!computedPath) {
      try {
        const { execSync } = require('child_process');
        const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
        computedPath = path.relative(gitRoot, cwd);
      } catch (err) {
        computedPath = '.';
      }
    }

    this.config = {
      preset: config.changelog?.preset || 'angular',
      infile: config.changelogFile || 'CHANGELOG.md',
      outfile: config.changelogFile || 'CHANGELOG.md',
      sameFile: true,
      tagPrefix: config.changelog?.tagPrefix || config.tagPrefix,
      path: computedPath,
      ...config
    };
  }

  async generate(from?: string, to?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let changelog = '';

      const stream = (conventionalChangelog as any)(
        {
          preset: this.config.preset,
          releaseCount: this.config.releaseCount,
          ...(from && { from }),
          ...(to && { to }),
          ...(this.config.tagPrefix && { tagPrefix: this.config.tagPrefix })
        },
        undefined, // context
        {
          ...(this.config.path && { path: this.config.path })
        }
      );

      stream.on('data', (chunk: Buffer) => {
        changelog += chunk.toString();
      });

      stream.on('end', async () => {
        if (this.config.sameFile && this.config.infile) {
          await this.updateExistingChangelog(changelog);
        } else {
          await fs.writeFile(this.config.outfile!, changelog);
        }
        resolve(changelog);
      });

      stream.on('error', reject);
    });
  }

  private async updateExistingChangelog(newContent: string): Promise<void> {
    const existingContent = await fs.readFile(this.config.infile!, 'utf-8');
    const updatedContent = newContent + '\n\n' + existingContent;
    await fs.writeFile(this.config.infile!, updatedContent);
  }

  async getLatestRelease(): Promise<string | null> {
    try {
      const content = await fs.readFile(this.config.infile!, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^## \[?(\d+\.\d+\.\d+)/);
        if (match) {
          return match[1];
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read
    }
    return null;
  }
}