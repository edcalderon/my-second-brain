// Unmock fs-extra since workspace env tests need real filesystem access
jest.unmock('fs-extra');

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import extension, {
  EnvManifest,
  parseEnvContent,
  syncWorkspaceEnv,
  validateWorkspaceEnv,
} from '../extensions/workspace-env/index';
import { Command } from 'commander';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-env-test-'));
});

afterEach(async () => {
  if (tmpDir && await fs.pathExists(tmpDir)) {
    await fs.remove(tmpDir);
  }
});

describe('workspace-env extension helpers', () => {
  it('parses dotenv content and ignores comments', () => {
    const parsed = parseEnvContent(`# comment\nAPI_URL=https://api.example.com\nEMPTY=\nQUOTED="value"\n`);
    expect(parsed.API_URL).toBe('https://api.example.com');
    expect(parsed.EMPTY).toBe('');
    expect(parsed.QUOTED).toBe('value');
  });

  it('syncs target env files and generates examples', async () => {
    await fs.writeFile(path.join(tmpDir, '.env'), 'API_BASE_URL=https://api.example.com\nSHARED_TOKEN=topsecret\n');

    const manifest: EnvManifest = {
      sources: ['.env'],
      targets: {
        landing: { path: 'apps/landing' },
      },
      variables: {
        API_BASE_URL: {
          description: 'Base URL',
          required: true,
          targets: { landing: 'NEXT_PUBLIC_API_BASE_URL' },
        },
        SHARED_TOKEN: {
          description: 'Private token',
          secret: true,
          required: true,
          targets: { landing: 'SHARED_TOKEN' },
        },
      },
    };

    const summary = await syncWorkspaceEnv(tmpDir, manifest);
    expect(summary.missingRequired).toHaveLength(0);

    const targetEnv = await fs.readFile(path.join(tmpDir, 'apps/landing/.env.local'), 'utf-8');
    expect(targetEnv).toContain('NEXT_PUBLIC_API_BASE_URL=https://api.example.com');
    expect(targetEnv).toContain('SHARED_TOKEN=topsecret');

    const targetExample = await fs.readFile(path.join(tmpDir, 'apps/landing/.env.example'), 'utf-8');
    expect(targetExample).toContain('NEXT_PUBLIC_API_BASE_URL=https://api.example.com');
    expect(targetExample).toContain('SHARED_TOKEN=');

    const rootExample = await fs.readFile(path.join(tmpDir, '.env.example'), 'utf-8');
    expect(rootExample).toContain('API_BASE_URL=https://api.example.com');
  });

  it('validates missing required variables and unknown root keys', async () => {
    await fs.writeFile(path.join(tmpDir, '.env'), 'UNKNOWN_THING=yes\n');

    const manifest: EnvManifest = {
      sources: ['.env'],
      targets: {
        landing: { path: 'apps/landing' },
      },
      variables: {
        API_BASE_URL: {
          required: true,
          targets: { landing: 'NEXT_PUBLIC_API_BASE_URL' },
        },
      },
    };

    const result = await validateWorkspaceEnv(tmpDir, manifest);
    expect(result.ok).toBe(false);
    expect(result.missingRequiredByTarget.landing).toContain('API_BASE_URL');
    expect(result.unknownRootKeys).toContain('UNKNOWN_THING');
  });
});

describe('workspace-env command registration', () => {
  it('registers env command with sync/doctor/validate subcommands', async () => {
    const program = new Command();
    await extension.register(program, {});

    const env = program.commands.find((c) => c.name() === 'env');
    expect(env).toBeDefined();
    expect(env?.commands.map((c) => c.name())).toEqual(expect.arrayContaining(['sync', 'doctor', 'validate']));
  });
});
