import { Command } from 'commander';
import { VersioningExtension } from '../../extensions';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Definition of patterns to search for
// Each pattern is a regex
const DEFAULT_PATTERNS = [
    // PEM / JSON private keys
    new RegExp('-----BEGIN ' + 'PRIVATE KEY-----'),
    new RegExp('-----BEGIN ' + 'RSA PRIVATE KEY-----'),
    /"private_key":\s*"/,
    /"private_key_id":\s*"/,
    // Cloud / API tokens
    /AIza[0-9A-Za-z\-_]{35}/,
    /ghp_[0-9A-Za-z]{36}/,
    /npm_[0-9A-Za-z]{36}/,
    // Ethereum / EVM hex private keys
    /PRIVATE_DEPLOYER=[0-9a-fA-F]{40,}/,
    /DEPLOYER_PRIVATE_KEY=0x[0-9a-fA-F]{40,}/,
    /PRIVATE_KEY=[0-9a-fA-F]{64}/,
    /_KEY=0x[0-9a-fA-F]{64}/,
    /cast wallet address 0x[0-9a-fA-F]{64}/,
    // Seed phrases
    /MNEMONIC=.{20,}/
];

// Allowlist patterns that are safe
const DEFAULT_ALLOWLIST = [
    "POOL_MANAGER_ADDRESS=",
    "HOOK_OWNER=",
    "NEXT_PUBLIC_",
    "ETHERSCAN_API_KEY=YOUR_",
    "RPC_URL=",
    "YOUR_DEPLOYER_PRIVATE_KEY",
    "YOUR_LOCAL_PRIVATE_KEY",
    "YOUR_TESTNET_PRIVATE_KEY",
    "your_private_key_here"
];

export interface SecretCheckResult {
    file: string;
    line: number;
    content: string;
    pattern: string;
}

export interface SecretsConfig {
    enabled?: boolean;
    patterns?: string[];
    allowlist?: string[];
}

export function checkContentForSecrets(
    content: string,
    patterns: RegExp[],
    allowlist: string[],
    filename: string
): SecretCheckResult[] {
    const results: SecretCheckResult[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of patterns) {
            if (pattern.test(line)) {
                // Check allowance
                let isAllowed = false;
                for (const allow of allowlist) {
                    if (line.includes(allow)) {
                        isAllowed = true;
                        break;
                    }
                }

                if (!isAllowed) {
                    results.push({
                        file: filename,
                        line: i + 1,
                        content: line.trim(),
                        pattern: pattern.toString()
                    });
                }
            }
        }
    }
    return results;
}

const extension: VersioningExtension = {
    name: 'secrets-check',
    description: 'Checks for hardcoded secrets and private keys in staged files',
    version: '1.1.0',

    register: async (program: Command, config: any) => {
        // Try to get config from extensionConfig first, fallback to top-level secrets for backcompat
        const extensionConfig = config.extensionConfig?.['secrets-check'];
        const secretsConfig: SecretsConfig = extensionConfig || config.secrets || {};

        if (secretsConfig.enabled === false) {
            return;
        }

        // Merge patterns
        const patterns = [...DEFAULT_PATTERNS];
        if (secretsConfig.patterns) {
            for (const p of secretsConfig.patterns) {
                try {
                    patterns.push(new RegExp(p));
                } catch (e) {
                    console.warn(`⚠️  Invalid regex pattern in config: ${p}`);
                }
            }
        }

        // Merge allowlist
        const allowlist = [...DEFAULT_ALLOWLIST];
        if (secretsConfig.allowlist) {
            allowlist.push(...secretsConfig.allowlist);
        }

        const secretsCmd = program
            .command('check-secrets')
            .description('Scan staged files for potential secrets')
            .action(async () => {
                await runSecretsCheck();
            });

        secretsCmd
            .command('husky')
            .description('Add secrets check to Husky pre-commit hook')
            .option('--remove', 'Remove secrets check from Husky hook', false)
            .action(async (options) => {
                const rootDir = process.cwd();
                const huskyDir = path.join(rootDir, '.husky');
                const hookPath = path.join(huskyDir, 'pre-commit');

                const MARKER_START = '# === secrets-check: start ===';
                const MARKER_END = '# === secrets-check: end ===';

                if (options.remove) {
                    if (!fs.existsSync(hookPath)) {
                        console.log('ℹ️  Hook pre-commit does not exist.');
                        return;
                    }

                    const content = fs.readFileSync(hookPath, 'utf8');
                    const startIdx = content.indexOf(MARKER_START);
                    const endIdx = content.indexOf(MARKER_END);

                    if (startIdx === -1 || endIdx === -1) {
                        console.log('ℹ️  No secrets-check block found in pre-commit.');
                        return;
                    }

                    const before = content.slice(0, startIdx).trimEnd();
                    const after = content.slice(endIdx + MARKER_END.length).trimStart();
                    const updated = [before, '', after].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

                    fs.writeFileSync(hookPath, updated, 'utf8');
                    console.log('✅ Removed secrets check from .husky/pre-commit');
                    return;
                }

                // Add cleanup block to hook
                if (!fs.existsSync(huskyDir)) {
                    fs.mkdirSync(huskyDir, { recursive: true });
                }

                const block = [
                    '',
                    MARKER_START,
                    'echo "🔒 Running secrets check…"',
                    'npx versioning check-secrets 2>/dev/null',
                    MARKER_END,
                    ''
                ].join('\n');

                if (fs.existsSync(hookPath)) {
                    const existing = fs.readFileSync(hookPath, 'utf8');

                    if (existing.includes(MARKER_START)) {
                        console.log('ℹ️  Secrets check is already integrated in .husky/pre-commit.');
                        return;
                    }

                    const updated = existing.trimEnd() + '\n' + block;
                    fs.writeFileSync(hookPath, updated, 'utf8');
                } else {
                    const content = [
                        '#!/bin/sh',
                        '. "$(dirname "$0")/_/husky.sh"',
                        '',
                        block
                    ].join('\n');
                    fs.writeFileSync(hookPath, content, { mode: 0o755 });
                }

                console.log('✅ Secrets check integrated into .husky/pre-commit');
            });

        async function runSecretsCheck() {
            try {
                console.log("🔒 Scanning for secrets...");
                let failed = false;

                // Get list of staged files
                let output = '';
                try {
                    output = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' });
                } catch (e) {
                    // If not in a git repo or no staged files, just return
                    console.log("⚠️  Not a git repository or git error.");
                    return;
                }

                const files = output.split('\n').filter(f => f.trim() !== '');

                if (files.length === 0) {
                    console.log("✅ No staged files to check.");
                    return;
                }

                for (const relativePath of files) {
                    const filePath = path.resolve(process.cwd(), relativePath);

                    // Skip check if file doesn't exist (deleted)
                    if (!fs.existsSync(filePath)) {
                        continue;
                    }

                    // Skip lock files
                    if (relativePath.includes('lock.yaml') || relativePath.includes('lock.json')) {
                        continue;
                    }

                    // Read file content
                    let content = '';
                    try {
                        content = fs.readFileSync(filePath, 'utf-8');
                    } catch (e) {
                        console.warn(`⚠️  Could not read file ${relativePath}:`, e);
                        continue;
                    }

                    const findings = checkContentForSecrets(content, patterns, allowlist, relativePath);

                    if (findings.length > 0) {
                        failed = true;
                        for (const finding of findings) {
                            console.log(`❌ POTENTIAL SECRET FOUND in ${finding.file}:${finding.line}`);
                            console.log(`   ${finding.content}`);
                            console.log(`   (matched pattern: ${finding.pattern})`);
                        }
                    }
                }

                if (failed) {
                    console.log("----------------------------------------------------");
                    console.log("⛔ COMMIT REJECTED");
                    console.log("Sensitive data was found in the staged files.");
                    console.log("Please remove the secrets before committing.");
                    console.log("----------------------------------------------------");
                    process.exit(1);
                } else {
                    console.log("✅ No secrets found.");
                }

            } catch (error) {
                console.error('❌ Check failed:', error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        }
    }
};

export default extension;
