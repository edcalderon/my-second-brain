import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';

export default {
    name: 'readme-maintainer',
    description: 'Maintain README files with latest changes from CHANGELOG',
    version: '1.1.0',

    register: async (program: Command, _config: any) => {
        program
            .command('update-readme')
            .description('Update README with the latest changes from its own CHANGELOG (resolves to cwd)')
            .option('--readme <file>', 'Path to README file (relative to cwd)', 'README.md')
            .option('--changelog <file>', 'Path to CHANGELOG file (relative to cwd)', 'CHANGELOG.md')
            .option('--pkg <file>', 'Path to package.json (relative to cwd, for version reference)', 'package.json')
            .action(async (options) => {
                try {
                    const cwd = process.cwd();
                    const readmePath = path.resolve(cwd, options.readme);
                    const changelogPath = path.resolve(cwd, options.changelog);
                    const pkgPath = path.resolve(cwd, options.pkg);

                    console.log(`📂 Working directory: ${cwd}`);
                    console.log(`📄 README: ${readmePath}`);
                    console.log(`📝 CHANGELOG: ${changelogPath}`);

                    if (!await fs.pathExists(readmePath)) {
                        console.error(`❌ README not found at ${readmePath}`);
                        process.exit(1);
                    }
                    if (!await fs.pathExists(changelogPath)) {
                        console.error(`❌ CHANGELOG not found at ${changelogPath}`);
                        process.exit(1);
                    }

                    // -------------------------------------------------------------------
                    // 1. Optionally read the authoritative version from package.json
                    // -------------------------------------------------------------------
                    let authoritativeVersion: string | null = null;
                    if (await fs.pathExists(pkgPath)) {
                        const pkg = await fs.readJson(pkgPath);
                        authoritativeVersion = pkg.version || null;
                        if (authoritativeVersion) {
                            console.log(`📦 Authoritative version from package.json: ${authoritativeVersion}`);
                        }
                    }

                    // -------------------------------------------------------------------
                    // 2. Parse ALL version blocks from the CHANGELOG
                    // -------------------------------------------------------------------
                    const changelogContent = await fs.readFile(changelogPath, 'utf8');
                    const lines = changelogContent.split('\n');

                    // Version header pattern — matches "## [1.2.3]" / "# 1.2.3" / "## 1.2.3 (date)" etc.
                    const versionHeaderPattern = /^(##?)\s+\[?v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\]?.*$/;

                    interface VersionBlock {
                        version: string;
                        header: string;
                        lines: string[];
                    }

                    const blocks: VersionBlock[] = [];
                    let currentBlock: VersionBlock | null = null;

                    for (const line of lines) {
                        const match = line.match(versionHeaderPattern);
                        if (match) {
                            if (currentBlock) blocks.push(currentBlock);
                            currentBlock = { version: match[2], header: line, lines: [] };
                        } else if (currentBlock) {
                            currentBlock.lines.push(line);
                        }
                    }
                    if (currentBlock) blocks.push(currentBlock);

                    if (blocks.length === 0) {
                        console.log('⚠️  No version headers found in CHANGELOG. Nothing updated.');
                        return;
                    }

                    // -------------------------------------------------------------------
                    // 3. Select the best block:
                    //    a) If authoritative version exists → use the matching block
                    //    b) Otherwise → use the block with the highest semver
                    // -------------------------------------------------------------------
                    let selectedBlock: VersionBlock | null = null;

                    if (authoritativeVersion) {
                        selectedBlock = blocks.find(b => b.version === authoritativeVersion) || null;
                        if (!selectedBlock) {
                            console.log(`⚠️  No CHANGELOG entry found for v${authoritativeVersion}. Falling back to highest semver.`);
                        }
                    }

                    if (!selectedBlock) {
                        // Sort by semver descending, pick the highest
                        const sorted = [...blocks].sort((a, b) => {
                            const diff = semver.rcompare(a.version, b.version);
                            return diff ?? 0;
                        });
                        selectedBlock = sorted[0];
                    }

                    // Clean up block content
                    const blockLines = [...selectedBlock.lines];
                    while (blockLines.length > 0 && blockLines[0].trim() === '') blockLines.shift();
                    while (blockLines.length > 0 && blockLines[blockLines.length - 1].trim() === '') blockLines.pop();

                    const extractedChanges = blockLines.join('\n');
                    const versionStr = selectedBlock.version;

                    const readmeDir = path.dirname(readmePath);
                    const changelogRelPath = path.relative(readmeDir, changelogPath).split(path.sep).join('/');
                    const changelogLinkPath = changelogRelPath.startsWith('..') ? changelogRelPath : `./${changelogRelPath}`;
                    const newBlock = [
                        `## 📋 Latest Changes (v${versionStr})`,
                        '',
                        extractedChanges,
                        '',
                        `For full version history, see [CHANGELOG.md](${changelogLinkPath}) and [GitHub releases](https://github.com/edcalderon/my-second-brain/releases)`,
                        '',
                    ].join('\n');

                    // -------------------------------------------------------------------
                    // 4. Replace the "## 📋 Latest Changes" section in README
                    // -------------------------------------------------------------------
                    const readmeContent = await fs.readFile(readmePath, 'utf8');
                    const readmeLines = readmeContent.split('\n');
                    const newReadmeLines: string[] = [];

                    const startPattern = /^##\s+(📋\s+)?Latest Changes/i;
                    // Stop skipping on any new h2 or horizontal rule
                    const stopPattern = /^(---$|##\s)/;

                    let skipping = false;
                    let replaced = false;

                    for (const line of readmeLines) {
                        if (startPattern.test(line)) {
                            skipping = true;
                            newReadmeLines.push(newBlock);
                            replaced = true;
                            continue;
                        }
                        if (skipping && stopPattern.test(line)) {
                            skipping = false;
                        }
                        if (!skipping) {
                            newReadmeLines.push(line);
                        }
                    }

                    if (!replaced) {
                        console.log('⚠️  Could not find "## 📋 Latest Changes" section in README. Please add it manually.');
                    } else {
                        await fs.writeFile(readmePath, newReadmeLines.join('\n'));
                        console.log(`✅ README updated → Latest Changes (v${versionStr})`);
                    }

                } catch (error: any) {
                    console.error('❌ Error updating README:', error.message);
                    process.exit(1);
                }
            });
    },

    hooks: {
        postChangelog: async (_options: any) => {
            console.log('💡 Syncing READMEs with the latest CHANGELOG entries...');
            try {
                const { execSync } = require('child_process');
                execSync('pnpm --recursive run --if-present update-readme', { stdio: 'inherit' });
            } catch (err) {
                console.log('⚠️  Failed to auto-sync readmes or none found.');
            }
        }
    }
};
