import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { VersioningExtension } from '../../extensions';

export interface EnvTargetConfig {
  path: string;
  envFile?: string;
  exampleFile?: string;
}

export interface EnvVariableConfig {
  aliases?: string[];
  description?: string;
  secret?: boolean;
  required?: boolean;
  example?: string;
  targets?: Record<string, string>;
}

export interface EnvManifest {
  sources?: string[];
  variables: Record<string, EnvVariableConfig>;
  targets: Record<string, EnvTargetConfig>;
}

export interface WorkspaceEnvConfig {
  enabled?: boolean;
  manifestPath?: string;
}

export interface SyncSummary {
  changedFiles: string[];
  unchangedFiles: string[];
  missingRequired: string[];
}

export interface ValidationResult {
  ok: boolean;
  missingRequiredByTarget: Record<string, string[]>;
  unknownRootKeys: string[];
}

const DEFAULT_MANIFEST_CANDIDATES = [
  'config/env/manifest.cjs',
  'config/env/manifest.js',
  'config/env/manifest.json'
];

export function parseEnvContent(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export async function loadRootEnv(rootDir: string, sources: string[]): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};

  for (const source of sources) {
    const sourcePath = path.resolve(rootDir, source);
    if (!(await fs.pathExists(sourcePath))) continue;

    const content = await fs.readFile(sourcePath, 'utf-8');
    const parsed = parseEnvContent(content);

    Object.assign(merged, parsed);
  }

  return merged;
}

export function resolveManifestPath(rootDir: string, configuredPath?: string): string {
  if (configuredPath) {
    return path.resolve(rootDir, configuredPath);
  }

  for (const candidate of DEFAULT_MANIFEST_CANDIDATES) {
    const candidatePath = path.resolve(rootDir, candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Workspace env manifest not found. Searched: ${DEFAULT_MANIFEST_CANDIDATES.join(', ')}. ` +
    'Set extensionConfig["workspace-env"].manifestPath in versioning.config.json to customize the location.'
  );
}

export async function loadManifest(manifestPath: string): Promise<EnvManifest> {
  const ext = path.extname(manifestPath).toLowerCase();

  if (ext === '.json') {
    return await fs.readJson(manifestPath);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const required = require(manifestPath);
  return required.default || required;
}

function pickCanonicalValue(canonicalKey: string, variable: EnvVariableConfig, rootValues: Record<string, string>): string | undefined {
  if (rootValues[canonicalKey] !== undefined) return rootValues[canonicalKey];

  for (const alias of variable.aliases || []) {
    if (rootValues[alias] !== undefined) return rootValues[alias];
  }

  return undefined;
}

function formatEnvFile(entries: Array<{ key: string; value: string; description?: string }>): string {
  const lines: string[] = [];

  for (const entry of entries) {
    if (entry.description) {
      lines.push(`# ${entry.description}`);
    }
    lines.push(`${entry.key}=${entry.value}`);
  }

  return `${lines.join('\n')}\n`;
}

async function writeIfChanged(filePath: string, content: string): Promise<boolean> {
  const exists = await fs.pathExists(filePath);
  if (exists) {
    const current = await fs.readFile(filePath, 'utf-8');
    if (current === content) return false;
  }

  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
  return true;
}

function getRelevantTargets(manifest: EnvManifest, targetFilter?: string[]): string[] {
  const allTargets = Object.keys(manifest.targets || {});
  if (!targetFilter || targetFilter.length === 0) return allTargets;

  return allTargets.filter((target) => targetFilter.includes(target));
}

export async function syncWorkspaceEnv(
  rootDir: string,
  manifest: EnvManifest,
  options?: { targets?: string[] }
): Promise<SyncSummary> {
  const sources = manifest.sources || ['.env', '.env.local'];
  const rootValues = await loadRootEnv(rootDir, sources);

  const changedFiles: string[] = [];
  const unchangedFiles: string[] = [];
  const missingRequired: string[] = [];

  const targetNames = getRelevantTargets(manifest, options?.targets);

  for (const targetName of targetNames) {
    const target = manifest.targets[targetName];
    const targetEnvEntries: Array<{ key: string; value: string; description?: string }> = [];
    const targetExampleEntries: Array<{ key: string; value: string; description?: string }> = [];

    for (const [canonical, variable] of Object.entries(manifest.variables || {})) {
      const mappedKey = variable.targets?.[targetName];
      if (!mappedKey) continue;

      const value = pickCanonicalValue(canonical, variable, rootValues);
      const required = variable.required === true;

      if (value === undefined && required) {
        missingRequired.push(`${targetName}:${canonical}`);
      }

      if (value !== undefined) {
        targetEnvEntries.push({ key: mappedKey, value, description: variable.description });
      }

      const exampleValue = variable.example ?? (variable.secret ? '' : (value ?? ''));
      targetExampleEntries.push({ key: mappedKey, value: exampleValue, description: variable.description });
    }

    const targetDir = path.resolve(rootDir, target.path);
    const envPath = path.join(targetDir, target.envFile || '.env.local');
    const examplePath = path.join(targetDir, target.exampleFile || '.env.example');

    const envChanged = await writeIfChanged(envPath, formatEnvFile(targetEnvEntries));
    const exChanged = await writeIfChanged(examplePath, formatEnvFile(targetExampleEntries));

    (envChanged ? changedFiles : unchangedFiles).push(path.relative(rootDir, envPath));
    (exChanged ? changedFiles : unchangedFiles).push(path.relative(rootDir, examplePath));
  }

  const rootExampleEntries = Object.entries(manifest.variables || {}).map(([canonical, variable]) => {
    const value = pickCanonicalValue(canonical, variable, rootValues);
    const exampleValue = variable.example ?? (variable.secret ? '' : (value ?? ''));
    return {
      key: canonical,
      value: exampleValue,
      description: variable.description
    };
  });

  const rootExamplePath = path.resolve(rootDir, '.env.example');
  const rootChanged = await writeIfChanged(rootExamplePath, formatEnvFile(rootExampleEntries));
  (rootChanged ? changedFiles : unchangedFiles).push(path.relative(rootDir, rootExamplePath));

  return {
    changedFiles,
    unchangedFiles,
    missingRequired
  };
}

export async function validateWorkspaceEnv(
  rootDir: string,
  manifest: EnvManifest,
  options?: { targets?: string[] }
): Promise<ValidationResult> {
  const sources = manifest.sources || ['.env', '.env.local'];
  const rootValues = await loadRootEnv(rootDir, sources);

  const missingRequiredByTarget: Record<string, string[]> = {};
  const targetNames = getRelevantTargets(manifest, options?.targets);

  for (const targetName of targetNames) {
    missingRequiredByTarget[targetName] = [];

    for (const [canonical, variable] of Object.entries(manifest.variables || {})) {
      const mappedKey = variable.targets?.[targetName];
      if (!mappedKey) continue;

      if (variable.required) {
        const value = pickCanonicalValue(canonical, variable, rootValues);
        if (value === undefined) {
          missingRequiredByTarget[targetName].push(canonical);
        }
      }
    }
  }

  const knownKeys = new Set<string>();
  for (const [canonical, variable] of Object.entries(manifest.variables || {})) {
    knownKeys.add(canonical);
    for (const alias of variable.aliases || []) {
      knownKeys.add(alias);
    }
  }

  const unknownRootKeys = Object.keys(rootValues).filter((k) => !knownKeys.has(k));
  const hasMissing = Object.values(missingRequiredByTarget).some((missing) => missing.length > 0);

  return {
    ok: !hasMissing,
    missingRequiredByTarget,
    unknownRootKeys
  };
}

const extension: VersioningExtension = {
  name: 'workspace-env',
  description: 'Workspace environment manifest management for monorepos',
  version: '1.0.0',

  register: async (program: Command, config: any) => {
    const extensionConfig: WorkspaceEnvConfig | undefined = config?.extensionConfig?.['workspace-env'];

    if (extensionConfig?.enabled === false) {
      return;
    }

    const env = program
      .command('env')
      .description('Workspace env manifest tools (sync, doctor, validate)');

    env
      .command('sync')
      .description('Generate target env files from canonical manifest')
      .option('-t, --target <targets>', 'Comma-separated target names to process')
      .action(async (options) => {
        const rootDir = process.cwd();
        const manifestPath = resolveManifestPath(rootDir, extensionConfig?.manifestPath);
        const manifest = await loadManifest(manifestPath);
        const targets = options.target ? String(options.target).split(',').map((t) => t.trim()) : undefined;

        const summary = await syncWorkspaceEnv(rootDir, manifest, { targets });

        console.log(`✅ env sync complete (${summary.changedFiles.length} changed, ${summary.unchangedFiles.length} unchanged)`);
        if (summary.missingRequired.length > 0) {
          console.log('⚠️  Missing required canonical variables:');
          summary.missingRequired.forEach((m) => console.log(`  - ${m}`));
        }
      });

    env
      .command('doctor')
      .description('Check missing required vars and unknown root vars')
      .option('-t, --target <targets>', 'Comma-separated target names to validate')
      .option('--fail-on-missing', 'Exit with non-zero code if required vars are missing', false)
      .action(async (options) => {
        const rootDir = process.cwd();
        const manifestPath = resolveManifestPath(rootDir, extensionConfig?.manifestPath);
        const manifest = await loadManifest(manifestPath);
        const targets = options.target ? String(options.target).split(',').map((t) => t.trim()) : undefined;

        const result = await validateWorkspaceEnv(rootDir, manifest, { targets });

        let hasMissing = false;
        for (const [target, missing] of Object.entries(result.missingRequiredByTarget)) {
          if (missing.length === 0) continue;
          hasMissing = true;
          console.log(`❌ ${target} missing required: ${missing.join(', ')}`);
        }

        if (result.unknownRootKeys.length > 0) {
          console.log(`⚠️  Unknown root keys: ${result.unknownRootKeys.join(', ')}`);
        }

        if (!hasMissing) {
          console.log('✅ env doctor: no missing required variables');
        }

        if (hasMissing && options.failOnMissing) {
          process.exit(1);
        }
      });

    env
      .command('validate')
      .description('Validate env mapping (CI-friendly, fails on missing required vars)')
      .option('-t, --target <targets>', 'Comma-separated target names to validate')
      .action(async (options) => {
        const rootDir = process.cwd();
        const manifestPath = resolveManifestPath(rootDir, extensionConfig?.manifestPath);
        const manifest = await loadManifest(manifestPath);
        const targets = options.target ? String(options.target).split(',').map((t) => t.trim()) : undefined;

        const result = await validateWorkspaceEnv(rootDir, manifest, { targets });
        const missing = Object.entries(result.missingRequiredByTarget)
          .filter(([, vars]) => vars.length > 0);

        if (missing.length > 0) {
          for (const [target, vars] of missing) {
            console.log(`❌ ${target} missing required: ${vars.join(', ')}`);
          }
          process.exit(1);
        }

        console.log('✅ env validate: all required variables are available');
      });
  }
};

export default extension;
