import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import simpleGit from 'simple-git';

import { VersioningExtension } from '../../extensions';

const CLEANUP_EXTENSION_NAME = 'cleanup-repo';

// ─────────────────────────────────────────────────────────────────
//  CONFIG SCHEMA – lives inside versioning.config.json → "cleanup"
// ─────────────────────────────────────────────────────────────────

/**
 * The canonical cleanup configuration schema.
 * Everything the plugin needs lives here.
 */
export interface CleanupRepoConfig {
    /** Master switch. Default: true */
    enabled: boolean;

    /** Default destination for files without a specific route. Default: "docs" */
    defaultDestination: string;

    /**
     * Files explicitly allowed to stay in root (on top of built-in essentials).
     * Supports exact filenames and glob-like patterns (e.g. "*.config.js").
     */
    allowlist: string[];

    /**
     * Files that should ALWAYS be moved, even if they match the allowlist.
     * Useful for forcing cleanup of specific known offenders.
     */
    denylist: string[];

    /**
     * File extensions to consider for cleanup (with leading dot).
     * Default: [".md", ".sh", ".json", ".yaml", ".yml", ".txt", ".log"]
     */
    extensions: string[];

    /**
     * Mapping of file extension → destination directory.
     * Overrides defaultDestination per extension.
     */
    routes: Record<string, string>;

    /**
     * Husky integration settings.
     */
    husky: {
        enabled: boolean;
        /** Which husky hook to attach to. Default: "pre-commit" */
        hook: string;
        /** "scan" = warning only, "enforce" = auto-move + git add. Default: "scan" */
        mode: 'scan' | 'enforce';
    };
}

// ─────────────────────────────────────────────────────────────────
//  BUILT-IN ESSENTIALS – these never get flagged
// ─────────────────────────────────────────────────────────────────

const BUILTIN_ALLOWLIST = new Set([
    'package.json',
    'pnpm-workspace.yaml',
    'pnpm-lock.yaml',
    'yarn.lock',
    'package-lock.json',
    'bun.lockb',
    'tsconfig.json',
    'tsconfig.base.json',
    '.gitignore',
    '.gitattributes',
    '.npmrc',
    '.nvmrc',
    '.node-version',
    '.editorconfig',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    'eslint.config.js',
    'eslint.config.mjs',
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.yaml',
    '.prettierignore',
    '.env',
    '.env.example',
    '.env.local',
    '.envrc',
    'LICENSE',
    'README.md',
    'Makefile',
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'firebase.json',
    'firestore.rules',
    'versioning.config.json',
    'turbo.json',
    'nx.json',
    'lerna.json',
    'biome.json',
    'renovate.json',
    '.releaserc.json',
    'jest.config.js',
    'jest.config.ts',
    'vitest.config.ts',
    'vitest.config.js',
    'tailwind.config.js',
    'tailwind.config.ts',
    'postcss.config.js',
    'postcss.config.mjs',
    'next.config.js',
    'next.config.mjs',
    'vite.config.ts',
    'vite.config.js',
]);

// ─────────────────────────────────────────────────────────────────
//  DEFAULTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_EXTENSIONS = ['.md', '.sh', '.json', '.yaml', '.yml', '.txt', '.log'];

const DEFAULT_ROUTES: Record<string, string> = {
    '.md': 'docs',
    '.sh': 'scripts',
    '.json': 'config',
    '.yaml': 'config',
    '.yml': 'config',
    '.txt': 'archive',
    '.log': 'archive',
};

// ─────────────────────────────────────────────────────────────────
//  CONFIG LOADER
// ─────────────────────────────────────────────────────────────────

function loadCleanupConfig(rootConfig: any): CleanupRepoConfig {
    const raw = rootConfig?.extensionConfig?.['cleanup-repo'] ?? rootConfig?.cleanup ?? {};

    return {
        enabled: raw.enabled !== false,
        defaultDestination: typeof raw.defaultDestination === 'string' ? raw.defaultDestination : 'docs',
        allowlist: Array.isArray(raw.allowlist) ? raw.allowlist : [],
        denylist: Array.isArray(raw.denylist) ? raw.denylist : [],
        extensions: Array.isArray(raw.extensions) ? raw.extensions.map((e: string) => e.startsWith('.') ? e : `.${e}`) : DEFAULT_EXTENSIONS,
        routes: typeof raw.routes === 'object' && raw.routes !== null ? raw.routes : DEFAULT_ROUTES,
        husky: {
            enabled: raw.husky?.enabled === true,
            hook: typeof raw.husky?.hook === 'string' ? raw.husky.hook : 'pre-commit',
            mode: raw.husky?.mode === 'enforce' ? 'enforce' : 'scan',
        },
    };
}

// ─────────────────────────────────────────────────────────────────
//  MATCHING HELPERS
// ─────────────────────────────────────────────────────────────────

/** Simple glob matching: supports exact names and "*.ext" patterns. */
function matchesPattern(filename: string, pattern: string): boolean {
    if (pattern === filename) return true;
    if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1); // e.g. ".config.js"
        return filename.endsWith(ext);
    }
    if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        return filename.startsWith(prefix);
    }
    return false;
}

function isAllowed(filename: string, config: CleanupRepoConfig): boolean {
    // Built-in essentials always allowed
    if (BUILTIN_ALLOWLIST.has(filename)) return true;

    // Check user allowlist from config
    for (const pattern of config.allowlist) {
        if (matchesPattern(filename, pattern)) return true;
    }

    return false;
}

function isDenied(filename: string, config: CleanupRepoConfig): boolean {
    for (const pattern of config.denylist) {
        if (matchesPattern(filename, pattern)) return true;
    }
    return false;
}

function getDestination(filename: string, ext: string, config: CleanupRepoConfig): string {
    // Check extension routes from config
    if (config.routes[ext]) return config.routes[ext];

    return config.defaultDestination;
}

function getReason(filename: string, ext: string, dest: string): string {
    const typeMap: Record<string, string> = {
        '.md': 'Markdown file',
        '.sh': 'Shell script',
        '.json': 'JSON config file',
        '.yaml': 'YAML file',
        '.yml': 'YAML file',
        '.txt': 'Text file',
        '.log': 'Log file',
    };
    const type = typeMap[ext] || 'File';
    return `${type} "${filename}" should live in ${dest}/`;
}

// ─────────────────────────────────────────────────────────────────
//  SCANNER
// ─────────────────────────────────────────────────────────────────

interface CleanupCandidate {
    file: string;
    ext: string;
    sizeBytes: number;
    reason: string;
    destination: string;
    isDenied: boolean;
}

async function scanRootForCleanup(
    rootDir: string,
    config: CleanupRepoConfig,
): Promise<CleanupCandidate[]> {
    const candidates: CleanupCandidate[] = [];
    const extensionSet = new Set(config.extensions);

    const entries = await fs.readdir(rootDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) continue;

        const name = entry.name;

        // Skip hidden dotfiles unless they match a cleanup extension
        const ext = path.extname(name).toLowerCase();
        if (name.startsWith('.') && !extensionSet.has(ext)) continue;

        // Denylist check — always flag these, even if allowlisted
        const denied = isDenied(name, config);

        if (!denied) {
            // Skip allowlisted files
            if (isAllowed(name, config)) continue;

            // Check if this extension is a cleanup candidate
            if (!extensionSet.has(ext)) continue;
        }

        const filePath = path.join(rootDir, name);
        const stat = await fs.stat(filePath);

        const dest = getDestination(name, ext, config);
        const reason = denied
            ? `"${name}" is in the denylist → forced move to ${dest}/`
            : getReason(name, ext, dest);

        candidates.push({
            file: name,
            ext,
            sizeBytes: stat.size,
            reason,
            destination: dest,
            isDenied: denied,
        });
    }

    return candidates;
}

// ─────────────────────────────────────────────────────────────────
//  EXTENSION
// ─────────────────────────────────────────────────────────────────

const extension: VersioningExtension = {
    name: CLEANUP_EXTENSION_NAME,
    description: 'Config-driven repo root cleanup — keeps stray files out of root, configurable via versioning.config.json',
    version: '1.1.0',

    register: async (program: Command, rootConfig: any) => {
        const config = loadCleanupConfig(rootConfig);

        const cleanupCmd = program
            .command('cleanup')
            .description('Repository root cleanup utilities (config: versioning.config.json → cleanup)');

        // ── versioning cleanup scan ──────────────────────────────────
        cleanupCmd.addCommand(
            new Command('scan')
                .description('Scan the repository root for files that should be moved')
                .option('-c, --config <file>', 'config file path', 'versioning.config.json')
                .action(async (options) => {
                    // Reload config in case user passed a different config file
                    const cfg = await reloadConfig(options.config);
                    const rootDir = process.cwd();

                    if (!cfg.enabled) {
                        console.log('ℹ️  Cleanup is disabled in versioning.config.json (cleanup.enabled = false)');
                        return;
                    }

                    const candidates = await scanRootForCleanup(rootDir, cfg);

                    if (candidates.length === 0) {
                        console.log('\n✅ Repository root is clean! No files need to be moved.\n');
                        return;
                    }

                    console.log('\n🔍 Repository Root Cleanup Scan\n');
                    console.log(`  Config: versioning.config.json → extensionConfig['cleanup-repo']`);
                    console.log(`  Default destination: ${cfg.defaultDestination}/`);
                    console.log(`  Extensions monitored: ${cfg.extensions.join(', ')}`);
                    console.log(`  Allowlist (custom): ${cfg.allowlist.length > 0 ? cfg.allowlist.join(', ') : '—'}`);
                    console.log(`  Denylist: ${cfg.denylist.length > 0 ? cfg.denylist.join(', ') : '—'}`);
                    console.log(`\nFound ${candidates.length} file(s) that should be moved:\n`);

                    for (const c of candidates) {
                        const size = c.sizeBytes > 1024 ? `${(c.sizeBytes / 1024).toFixed(1)}KB` : `${c.sizeBytes}B`;
                        const badge = c.isDenied ? ' 🚫 DENIED' : '';
                        console.log(`  📄 ${c.file} (${size})${badge}`);
                        console.log(`     → ${c.destination}/${c.file}`);
                        console.log(`     ℹ️  ${c.reason}\n`);
                    }

                    console.log('  Run `versioning cleanup move` to move these files.');
                    console.log('  Edit versioning.config.json → cleanup.allowlist to keep specific files in root.\n');
                })
        );

        // ── versioning cleanup move ──────────────────────────────────
        cleanupCmd.addCommand(
            new Command('move')
                .description('Move stray files from root to their configured destinations')
                .option('-c, --config <file>', 'config file path', 'versioning.config.json')
                .option('-d, --dest <path>', 'Override default destination directory')
                .option('--force', 'Overwrite files at destination', false)
                .option('--dry-run', 'Show what would happen without moving', false)
                .option('--git-add', 'Stage moves with git after moving', false)
                .action(async (options) => {
                    const cfg = await reloadConfig(options.config);
                    const rootDir = process.cwd();

                    if (!cfg.enabled) {
                        console.log('ℹ️  Cleanup is disabled in config.');
                        return;
                    }

                    // Override default destination if passed via CLI
                    if (options.dest) {
                        cfg.defaultDestination = options.dest;
                    }

                    const candidates = await scanRootForCleanup(rootDir, cfg);

                    if (candidates.length === 0) {
                        console.log('\n✅ Repository root is already clean!\n');
                        return;
                    }

                    console.log(`\n🧹 Moving ${candidates.length} file(s) from root…\n`);

                    const moved: string[] = [];

                    for (const c of candidates) {
                        const destDir = path.join(rootDir, c.destination);
                        const srcPath = path.join(rootDir, c.file);
                        const destPath = path.join(destDir, c.file);

                        if (options.dryRun) {
                            console.log(`  [dry-run] ${c.file} → ${c.destination}/${c.file}`);
                            continue;
                        }

                        try {
                            await fs.ensureDir(destDir);

                            if (await fs.pathExists(destPath)) {
                                if (!options.force) {
                                    console.log(`  ⚠️  Skipped ${c.file} (already exists at ${c.destination}/${c.file})`);
                                    continue;
                                }
                            }

                            await fs.move(srcPath, destPath, { overwrite: options.force });
                            moved.push(c.file);
                            console.log(`  ✅ ${c.file} → ${c.destination}/${c.file}`);
                        } catch (error) {
                            console.error(`  ❌ Failed to move ${c.file}: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    }

                    if (options.gitAdd && moved.length > 0 && !options.dryRun) {
                        try {
                            const git = simpleGit();
                            await git.add('.');
                            console.log(`\n📦 Staged ${moved.length} moved file(s) with git.`);
                        } catch (error) {
                            console.warn(`\n⚠️  Could not stage changes: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    }

                    if (!options.dryRun) {
                        console.log(`\n✅ Moved ${moved.length}/${candidates.length} file(s). Root is cleaner!\n`);
                    } else {
                        console.log(`\n📋 Dry run complete. ${candidates.length} file(s) would be moved.\n`);
                    }
                })
        );

        // ── versioning cleanup restore ───────────────────────────────
        cleanupCmd.addCommand(
            new Command('restore')
                .description('Restore a previously moved file back to root')
                .requiredOption('--file <name>', 'File name to restore')
                .option('--from <path>', 'Source directory to restore from (auto-detects from routes if omitted)')
                .option('-c, --config <file>', 'config file path', 'versioning.config.json')
                .action(async (options) => {
                    const cfg = await reloadConfig(options.config);
                    const rootDir = process.cwd();

                    // Auto-detect source from configured routes if --from not specified
                    let fromDir = options.from;
                    if (!fromDir) {
                        const ext = path.extname(options.file).toLowerCase();
                        fromDir = cfg.routes[ext] || cfg.defaultDestination;
                    }

                    const srcPath = path.join(rootDir, fromDir, options.file);
                    const destPath = path.join(rootDir, options.file);

                    if (!(await fs.pathExists(srcPath))) {
                        console.error(`❌ File not found: ${srcPath}`);
                        process.exit(1);
                    }

                    if (await fs.pathExists(destPath)) {
                        console.error(`❌ File already exists in root: ${options.file}`);
                        process.exit(1);
                    }

                    await fs.move(srcPath, destPath);
                    console.log(`✅ Restored ${fromDir}/${options.file} → ${options.file}`);
                })
        );

        // ── versioning cleanup config ────────────────────────────────
        cleanupCmd.addCommand(
            new Command('config')
                .description('View or manage the cleanup configuration in versioning.config.json')
                .option('--show', 'Show the full resolved cleanup config', false)
                .option('--allow <file>', 'Add a file to the allowlist')
                .option('--deny <file>', 'Add a file to the denylist')
                .option('--unallow <file>', 'Remove a file from the allowlist')
                .option('--undeny <file>', 'Remove a file from the denylist')
                .option('--route <mapping>', 'Add extension route (format: ".ext=destination")')
                .option('--set-dest <path>', 'Set the default destination directory')
                .option('-c, --config <file>', 'config file path', 'versioning.config.json')
                .action(async (options) => {
                    const configPath = String(options.config);
                    let rawCfg: any = {};
                    if (await fs.pathExists(configPath)) {
                        rawCfg = await fs.readJson(configPath);
                    }

                    // Ensure extensionConfig section exists
                    if (!rawCfg.extensionConfig) rawCfg.extensionConfig = {};
                    if (!rawCfg.extensionConfig['cleanup-repo']) {
                        rawCfg.extensionConfig['cleanup-repo'] = rawCfg.cleanup || {};
                    }
                    const extensionCfg = rawCfg.extensionConfig['cleanup-repo'];
                    if (!Array.isArray(extensionCfg.allowlist)) extensionCfg.allowlist = [];
                    if (!Array.isArray(extensionCfg.denylist)) extensionCfg.denylist = [];
                    if (!extensionCfg.routes) extensionCfg.routes = { ...DEFAULT_ROUTES };
                    if (!extensionCfg.extensions) extensionCfg.extensions = [...DEFAULT_EXTENSIONS];

                    let modified = false;

                    // ── --allow
                    if (options.allow) {
                        const file = String(options.allow).trim();
                        if (!extensionCfg.allowlist.includes(file)) {
                            extensionCfg.allowlist.push(file);
                            modified = true;
                            console.log(`✅ Added "${file}" to cleanup.allowlist`);
                        } else {
                            console.log(`ℹ️  "${file}" is already in the allowlist.`);
                        }
                    }

                    // ── --deny
                    if (options.deny) {
                        const file = String(options.deny).trim();
                        if (!extensionCfg.denylist.includes(file)) {
                            extensionCfg.denylist.push(file);
                            modified = true;
                            console.log(`✅ Added "${file}" to cleanup.denylist`);
                        } else {
                            console.log(`ℹ️  "${file}" is already in the denylist.`);
                        }
                    }

                    // ── --unallow
                    if (options.unallow) {
                        const file = String(options.unallow).trim();
                        const idx = extensionCfg.allowlist.indexOf(file);
                        if (idx !== -1) {
                            extensionCfg.allowlist.splice(idx, 1);
                            modified = true;
                            console.log(`✅ Removed "${file}" from cleanup.allowlist`);
                        } else {
                            console.log(`ℹ️  "${file}" is not in the allowlist.`);
                        }
                    }

                    // ── --undeny
                    if (options.undeny) {
                        const file = String(options.undeny).trim();
                        const idx = extensionCfg.denylist.indexOf(file);
                        if (idx !== -1) {
                            extensionCfg.denylist.splice(idx, 1);
                            modified = true;
                            console.log(`✅ Removed "${file}" from cleanup.denylist`);
                        } else {
                            console.log(`ℹ️  "${file}" is not in the denylist.`);
                        }
                    }

                    // ── --route
                    if (options.route) {
                        const mapping = String(options.route).trim();
                        const eqIdx = mapping.indexOf('=');
                        if (eqIdx === -1) {
                            console.error('❌ Route format must be ".ext=destination" (e.g. ".md=docs")');
                            process.exit(1);
                        }
                        let ext = mapping.slice(0, eqIdx).trim();
                        const dest = mapping.slice(eqIdx + 1).trim();
                        if (!ext.startsWith('.')) ext = `.${ext}`;
                        extensionCfg.routes[ext] = dest;
                        modified = true;
                        console.log(`✅ Added route: ${ext} → ${dest}/`);
                    }

                    // ── --set-dest
                    if (options.setDest) {
                        extensionCfg.defaultDestination = String(options.setDest).trim();
                        modified = true;
                        console.log(`✅ Default destination set to "${extensionCfg.defaultDestination}"`);
                    }

                    // Write config if modified
                    if (modified) {
                        await fs.writeJson(configPath, rawCfg, { spaces: 2 });
                        console.log(`\n📝 Updated ${configPath}`);
                    }

                    // ── --show or no flags
                    if (options.show || (!options.allow && !options.deny && !options.unallow && !options.undeny && !options.route && !options.setDest)) {
                        const resolved = loadCleanupConfig(rawCfg);

                        console.log('\n┌─────────────────────────────────────────────────┐');
                        console.log('│     🧹 Cleanup-Repo Configuration                │');
                        console.log('├─────────────────────────────────────────────────┤');
                        console.log(`│  Enabled:           ${String(resolved.enabled).padEnd(28)}│`);
                        console.log(`│  Default dest:      ${resolved.defaultDestination.padEnd(28)}│`);
                        console.log('│                                                 │');
                        console.log('│  📋 Extensions monitored:                       │');
                        for (const ext of resolved.extensions) {
                            const route = resolved.routes[ext] || resolved.defaultDestination;
                            console.log(`│    ${ext.padEnd(8)} → ${route.padEnd(34)}│`);
                        }
                        console.log('│                                                 │');
                        console.log('│  ✅ Allowlist (custom):                          │');
                        if (resolved.allowlist.length === 0) {
                            console.log('│    (none)                                       │');
                        } else {
                            for (const f of resolved.allowlist) {
                                console.log(`│    + ${f.padEnd(42)}│`);
                            }
                        }
                        console.log('│                                                 │');
                        console.log('│  🚫 Denylist (force-move):                       │');
                        if (resolved.denylist.length === 0) {
                            console.log('│    (none)                                       │');
                        } else {
                            for (const f of resolved.denylist) {
                                console.log(`│    - ${f.padEnd(42)}│`);
                            }
                        }
                        console.log('│                                                 │');
                        console.log(`│  🔗 Husky integration: ${String(resolved.husky.enabled).padEnd(25)}│`);
                        if (resolved.husky.enabled) {
                            console.log(`│    Hook: ${resolved.husky.hook.padEnd(39)}│`);
                            console.log(`│    Mode: ${resolved.husky.mode.padEnd(39)}│`);
                        }
                        console.log('│                                                 │');
                        console.log('│  📦 Built-in essentials (always kept):           │');
                        const builtinArr = Array.from(BUILTIN_ALLOWLIST).sort().slice(0, 8);
                        for (const f of builtinArr) {
                            console.log(`│    ✓ ${f.padEnd(42)}│`);
                        }
                        console.log(`│    … and ${BUILTIN_ALLOWLIST.size - builtinArr.length} more                                │`);
                        console.log('└─────────────────────────────────────────────────┘\n');
                    }
                })
        );

        // ── versioning cleanup husky ─────────────────────────────────
        cleanupCmd.addCommand(
            new Command('husky')
                .description('Set up Husky hooks to auto-run cleanup on each commit')
                .option('--remove', 'Remove cleanup from Husky hook', false)
                .option('-c, --config <file>', 'config file path', 'versioning.config.json')
                .action(async (options) => {
                    const cfg = await reloadConfig(options.config);
                    const rootDir = process.cwd();
                    const huskyDir = path.join(rootDir, '.husky');
                    const hookName = cfg.husky.hook;
                    const hookPath = path.join(huskyDir, hookName);

                    const CLEANUP_MARKER_START = '# === cleanup-repo: start ===';
                    const CLEANUP_MARKER_END = '# === cleanup-repo: end ===';

                    if (options.remove) {
                        if (!(await fs.pathExists(hookPath))) {
                            console.log(`ℹ️  Hook ${hookName} does not exist.`);
                            return;
                        }

                        const content = await fs.readFile(hookPath, 'utf8');
                        const startIdx = content.indexOf(CLEANUP_MARKER_START);
                        const endIdx = content.indexOf(CLEANUP_MARKER_END);

                        if (startIdx === -1 || endIdx === -1) {
                            console.log(`ℹ️  No cleanup block found in ${hookName}.`);
                            return;
                        }

                        const before = content.slice(0, startIdx).trimEnd();
                        const after = content.slice(endIdx + CLEANUP_MARKER_END.length).trimStart();
                        const updated = [before, '', after].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

                        await fs.writeFile(hookPath, updated, 'utf8');

                        // Also update config
                        await updateHuskyConfig(options.config, false);

                        console.log(`✅ Removed cleanup block from .husky/${hookName}`);
                        return;
                    }

                    // Add cleanup block to hook
                    await fs.ensureDir(huskyDir);

                    const cleanupBlock = cfg.husky.mode === 'enforce'
                        ? [
                            '',
                            CLEANUP_MARKER_START,
                            'echo "🧹 Running root cleanup (enforce mode)…"',
                            'npx versioning cleanup move --force --git-add 2>/dev/null || true',
                            CLEANUP_MARKER_END,
                            ''
                        ].join('\n')
                        : [
                            '',
                            CLEANUP_MARKER_START,
                            'echo "🔍 Running root cleanup scan…"',
                            'npx versioning cleanup scan 2>/dev/null || true',
                            CLEANUP_MARKER_END,
                            ''
                        ].join('\n');

                    if (await fs.pathExists(hookPath)) {
                        const existing = await fs.readFile(hookPath, 'utf8');

                        if (existing.includes(CLEANUP_MARKER_START)) {
                            console.log(`ℹ️  Cleanup is already integrated in .husky/${hookName}.`);
                            console.log('    Use --remove to uninstall, then re-add.');
                            return;
                        }

                        const updated = existing.trimEnd() + '\n' + cleanupBlock;
                        await fs.writeFile(hookPath, updated, 'utf8');
                    } else {
                        const content = [
                            '#!/bin/sh',
                            '. "$(dirname "$0")/_/husky.sh"',
                            '',
                            cleanupBlock
                        ].join('\n');
                        await fs.writeFile(hookPath, content, { mode: 0o755 });
                    }

                    // Also update config
                    await updateHuskyConfig(options.config, true, hookName, cfg.husky.mode);

                    const mode = cfg.husky.mode === 'enforce' ? 'enforce (auto-move + git-add)' : 'scan (warning only)';
                    console.log(`✅ Cleanup integrated into .husky/${hookName} [${mode}]`);
                    console.log(`   Configure mode in versioning.config.json → cleanup.husky.mode`);
                })
        );
    }
};

// ─────────────────────────────────────────────────────────────────
//  HELPER: reload config from disk
// ─────────────────────────────────────────────────────────────────

async function reloadConfig(configPath: string): Promise<CleanupRepoConfig> {
    const fullPath = String(configPath);
    if (await fs.pathExists(fullPath)) {
        const raw = await fs.readJson(fullPath);
        return loadCleanupConfig(raw);
    }
    return loadCleanupConfig({});
}

async function updateHuskyConfig(configPath: string, enabled: boolean, hook?: string, mode?: string): Promise<void> {
    const fullPath = String(configPath);
    let rawCfg: any = {};
    if (await fs.pathExists(fullPath)) {
        rawCfg = await fs.readJson(fullPath);
    }

    if (!rawCfg.extensionConfig) rawCfg.extensionConfig = {};
    if (!rawCfg.extensionConfig['cleanup-repo']) {
        rawCfg.extensionConfig['cleanup-repo'] = rawCfg.cleanup || {};
    }
    const extensionCfg = rawCfg.extensionConfig['cleanup-repo'];
    if (!extensionCfg.husky) extensionCfg.husky = {};

    extensionCfg.husky.enabled = enabled;
    if (hook) extensionCfg.husky.hook = hook;
    if (mode) extensionCfg.husky.mode = mode;

    await fs.writeJson(fullPath, rawCfg, { spaces: 2 });
}

export { loadCleanupConfig, BUILTIN_ALLOWLIST, DEFAULT_EXTENSIONS, DEFAULT_ROUTES };
export default extension;
