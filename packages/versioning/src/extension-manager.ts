import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';

export interface ExtensionInfo {
  name: string;
  version: string;
  description: string;
  path: string;
  changelogPath?: string;
}

export class ExtensionManager {
  private extensionsDir: string;

  constructor(extensionsDir?: string) {
    // In built version, __dirname is dist/, so go up one level to src/
    const baseDir = path.dirname(__dirname);
    this.extensionsDir = extensionsDir || path.join(baseDir, 'src', 'extensions');
  }

  async listExtensions(): Promise<ExtensionInfo[]> {
    const extensions: ExtensionInfo[] = [];

    if (!(await fs.pathExists(this.extensionsDir))) {
      return extensions;
    }

    const dirs = await fs.readdir(this.extensionsDir);

    for (const dir of dirs) {
      const extensionPath = path.join(this.extensionsDir, dir);
      const stat = await fs.stat(extensionPath);

      if (!stat.isDirectory()) continue;

      const indexPath = path.join(extensionPath, 'index.ts');
      if (!(await fs.pathExists(indexPath))) continue;

      const content = await fs.readFile(indexPath, 'utf-8');
      const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);
      const descriptionMatch = content.match(/description:\s*['"]([^'"]+)['"]/);

      if (versionMatch) {
        const changelogPath = path.join(extensionPath, 'CHANGELOG.md');
        const hasChangelog = await fs.pathExists(changelogPath);

        extensions.push({
          name: dir,
          version: versionMatch[1],
          description: descriptionMatch ? descriptionMatch[1] : 'No description',
          path: extensionPath,
          changelogPath: hasChangelog ? changelogPath : undefined
        });
      }
    }

    return extensions;
  }

  async bumpExtensionVersion(extensionName: string, bumpType: 'patch' | 'minor' | 'major'): Promise<string> {
    const extensionPath = path.join(this.extensionsDir, extensionName, 'index.ts');

    if (!(await fs.pathExists(extensionPath))) {
      throw new Error(`Extension not found: ${extensionName}`);
    }

    const content = await fs.readFile(extensionPath, 'utf-8');
    const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);

    if (!versionMatch) {
      throw new Error(`Could not find version in ${extensionName}`);
    }

    const currentVersion = versionMatch[1];
    const newVersion = semver.inc(currentVersion, bumpType);

    if (!newVersion) {
      throw new Error(`Invalid bump type: ${bumpType}`);
    }

    // Update version in index.ts
    const updatedContent = content.replace(
      /version:\s*['"]([^'"]+)['"]/,
      `version: '${newVersion}'`
    );

    await fs.writeFile(extensionPath, updatedContent);

    // Update changelog if it exists
    await this.updateExtensionChangelog(extensionName, currentVersion, newVersion, bumpType);

    return newVersion;
  }

  private async updateExtensionChangelog(
    extensionName: string,
    oldVersion: string,
    newVersion: string,
    bumpType: string
  ): Promise<void> {
    const changelogPath = path.join(this.extensionsDir, extensionName, 'CHANGELOG.md');

    if (!(await fs.pathExists(changelogPath))) {
      // Create changelog if it doesn't exist
      const changelog = `# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${newVersion}] - ${new Date().toISOString().split('T')[0]}

### ${this.getChangeType(bumpType)}
- Version bump from ${oldVersion}
`;
      await fs.writeFile(changelogPath, changelog);
      return;
    }

    // Update existing changelog
    const content = await fs.readFile(changelogPath, 'utf-8');
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `\n## [${newVersion}] - ${today}\n\n### ${this.getChangeType(bumpType)}\n- Version bump from ${oldVersion}\n`;

    // Find the first version entry and insert before it
    const lines = content.split('\n');
    const firstVersionIndex = lines.findIndex(line => line.match(/^## \[\d+\.\d+\.\d+\]/));

    if (firstVersionIndex >= 0) {
      lines.splice(firstVersionIndex, 0, newEntry.trim());
    } else {
      lines.push(newEntry.trim());
    }

    await fs.writeFile(changelogPath, lines.join('\n'));
  }

  private getChangeType(bumpType: string): string {
    switch (bumpType) {
      case 'major': return 'Breaking';
      case 'minor': return 'Features';
      case 'patch': return 'Fixes';
      default: return 'Changes';
    }
  }

  async getExtensionChangelog(extensionName: string): Promise<string | null> {
    const changelogPath = path.join(this.extensionsDir, extensionName, 'CHANGELOG.md');

    if (!(await fs.pathExists(changelogPath))) {
      return null;
    }

    return await fs.readFile(changelogPath, 'utf-8');
  }

  async createExtensionChangelog(extensionName: string): Promise<void> {
    const changelogPath = path.join(this.extensionsDir, extensionName, 'CHANGELOG.md');

    if (await fs.pathExists(changelogPath)) {
      throw new Error(`Changelog already exists for ${extensionName}`);
    }

    const extensionPath = path.join(this.extensionsDir, extensionName, 'index.ts');
    if (!(await fs.pathExists(extensionPath))) {
      throw new Error(`Extension not found: ${extensionName}`);
    }

    const content = await fs.readFile(extensionPath, 'utf-8');
    const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);
    const version = versionMatch ? versionMatch[1] : '1.0.0';

    const changelog = `# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release
`;

    await fs.writeFile(changelogPath, changelog);
  }
}