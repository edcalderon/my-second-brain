// Unmock fs-extra for this test file — the guard tests need real I/O
jest.unmock('fs-extra');

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import {
  stripTag,
  validateTagVersionMatch,
  runReleaseGuard,
  ReleaseGuardConfig
} from '../extensions/release-guard/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function writePkgJson(dir: string, version: string): Promise<string> {
  const pkgPath = path.join(dir, 'package.json');
  await fs.writeJson(pkgPath, { name: 'test-pkg', version });
  return pkgPath;
}

// ---------------------------------------------------------------------------
// stripTag
// ---------------------------------------------------------------------------

describe('stripTag', () => {
  test('strips a "v" prefix', () => {
    expect(stripTag('v1.2.3', 'v', false)).toBe('1.2.3');
  });

  test('returns tag unchanged when prefix does not match', () => {
    expect(stripTag('1.2.3', 'v', false)).toBe('1.2.3');
  });

  test('strips build metadata when allowBuildMetadata is true', () => {
    expect(stripTag('v1.2.3+build.4', 'v', true)).toBe('1.2.3');
  });

  test('keeps build metadata when allowBuildMetadata is false', () => {
    expect(stripTag('v1.2.3+build.4', 'v', false)).toBe('1.2.3+build.4');
  });

  test('handles empty tagPrefix', () => {
    expect(stripTag('1.2.3', '', false)).toBe('1.2.3');
  });

  test('handles empty tagPrefix with build metadata', () => {
    expect(stripTag('1.2.3+build.99', '', true)).toBe('1.2.3');
  });

  test('handles custom tag prefix', () => {
    expect(stripTag('release/1.2.3', 'release/', false)).toBe('1.2.3');
  });
});

// ---------------------------------------------------------------------------
// validateTagVersionMatch
// ---------------------------------------------------------------------------

describe('validateTagVersionMatch', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'release-guard-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('returns valid:true when tag matches package version', async () => {
    const pkgPath = await writePkgJson(tmpDir, '1.2.3');
    const result = await validateTagVersionMatch('v1.2.3', pkgPath, {
      tagPrefix: 'v',
      allowBuildMetadata: false
    });
    expect(result.valid).toBe(true);
    expect(result.packageVersion).toBe('1.2.3');
    expect(result.tag).toBe('v1.2.3');
    expect(result.message).toMatch(/matches/);
  });

  test('returns valid:false when tag does not match package version', async () => {
    const pkgPath = await writePkgJson(tmpDir, '1.2.4');
    const result = await validateTagVersionMatch('v1.2.3', pkgPath, {
      tagPrefix: 'v',
      allowBuildMetadata: false
    });
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/does not match/);
  });

  test('strips build metadata before comparing when allowBuildMetadata is true', async () => {
    const pkgPath = await writePkgJson(tmpDir, '1.2.3');
    const result = await validateTagVersionMatch('v1.2.3+build.4', pkgPath, {
      tagPrefix: 'v',
      allowBuildMetadata: true
    });
    expect(result.valid).toBe(true);
  });

  test('does not strip build metadata when allowBuildMetadata is false', async () => {
    const pkgPath = await writePkgJson(tmpDir, '1.2.3');
    const result = await validateTagVersionMatch('v1.2.3+build.4', pkgPath, {
      tagPrefix: 'v',
      allowBuildMetadata: false
    });
    // "1.2.3+build.4" !== "1.2.3"
    expect(result.valid).toBe(false);
  });

  test('uses default options (tagPrefix "v", allowBuildMetadata true) when not specified', async () => {
    const pkgPath = await writePkgJson(tmpDir, '2.0.0');
    const result = await validateTagVersionMatch('v2.0.0', pkgPath);
    expect(result.valid).toBe(true);
  });

  test('throws when package.json does not exist', async () => {
    await expect(
      validateTagVersionMatch('v1.0.0', path.join(tmpDir, 'missing', 'package.json'))
    ).rejects.toThrow('package.json not found');
  });

  test('throws when package.json has no version field', async () => {
    const pkgPath = path.join(tmpDir, 'package.json');
    await fs.writeJson(pkgPath, { name: 'no-version' });
    await expect(
      validateTagVersionMatch('v1.0.0', pkgPath)
    ).rejects.toThrow('No valid "version" field found');
  });
});

// ---------------------------------------------------------------------------
// runReleaseGuard
// ---------------------------------------------------------------------------

describe('runReleaseGuard', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'release-guard-run-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('resolves when tag matches the root package.json', async () => {
    const pkgPath = await writePkgJson(tmpDir, '1.0.0');
    const guardConfig: ReleaseGuardConfig = {
      tagPrefix: 'v',
      packageJsonPath: pkgPath,
      allowBuildMetadata: true,
      packages: []
    };
    await expect(runReleaseGuard('v1.0.0', guardConfig)).resolves.toBeUndefined();
  });

  test('throws when root package.json version mismatches the tag', async () => {
    const pkgPath = await writePkgJson(tmpDir, '1.0.1');
    const guardConfig: ReleaseGuardConfig = {
      tagPrefix: 'v',
      packageJsonPath: pkgPath,
      allowBuildMetadata: true,
      packages: []
    };
    await expect(runReleaseGuard('v1.0.0', guardConfig)).rejects.toThrow(
      'Release guard failed'
    );
  });

  test('validates multiple monorepo packages', async () => {
    const pkg1 = await writePkgJson(tmpDir, '3.0.0');
    const subDir = path.join(tmpDir, 'packages', 'app');
    await fs.ensureDir(subDir);
    const pkg2 = await writePkgJson(subDir, '3.0.0');

    const guardConfig: ReleaseGuardConfig = {
      tagPrefix: 'v',
      packageJsonPath: pkg1,
      allowBuildMetadata: true,
      packages: [pkg2]
    };
    await expect(runReleaseGuard('v3.0.0', guardConfig)).resolves.toBeUndefined();
  });

  test('throws when any monorepo package has a mismatched version', async () => {
    const pkg1 = await writePkgJson(tmpDir, '3.0.0');
    const subDir = path.join(tmpDir, 'packages', 'app');
    await fs.ensureDir(subDir);
    const pkg2 = await writePkgJson(subDir, '2.9.9'); // drift!

    const guardConfig: ReleaseGuardConfig = {
      tagPrefix: 'v',
      packageJsonPath: pkg1,
      allowBuildMetadata: true,
      packages: [pkg2]
    };
    await expect(runReleaseGuard('v3.0.0', guardConfig)).rejects.toThrow(
      'Release guard failed'
    );
  });

  test('accepts build metadata tags when allowBuildMetadata is true', async () => {
    const pkgPath = await writePkgJson(tmpDir, '1.0.0');
    const guardConfig: ReleaseGuardConfig = {
      tagPrefix: 'v',
      packageJsonPath: pkgPath,
      allowBuildMetadata: true,
      packages: []
    };
    await expect(runReleaseGuard('v1.0.0+build.123', guardConfig)).resolves.toBeUndefined();
  });

  test('rejects build metadata tags when allowBuildMetadata is false', async () => {
    const pkgPath = await writePkgJson(tmpDir, '1.0.0');
    const guardConfig: ReleaseGuardConfig = {
      tagPrefix: 'v',
      packageJsonPath: pkgPath,
      allowBuildMetadata: false,
      packages: []
    };
    await expect(runReleaseGuard('v1.0.0+build.123', guardConfig)).rejects.toThrow(
      'Release guard failed'
    );
  });
});

// ---------------------------------------------------------------------------
// Extension object
// ---------------------------------------------------------------------------

describe('release-guard extension object', () => {
  let extension: any;

  beforeAll(async () => {
    const mod = await import('../extensions/release-guard/index');
    extension = mod.default;
  });

  test('has required extension fields', () => {
    expect(extension.name).toBe('release-guard');
    expect(typeof extension.version).toBe('string');
    expect(typeof extension.description).toBe('string');
    expect(typeof extension.register).toBe('function');
  });

  test('exposes a preRelease hook', () => {
    expect(extension.hooks).toBeDefined();
    expect(typeof extension.hooks.preRelease).toBe('function');
  });

  test('preRelease hook is a no-op when enabled is false', async () => {
    await expect(
      extension.hooks.preRelease('1.0.0', {
        extensionConfig: { 'release-guard': { enabled: false } }
      })
    ).resolves.toBeUndefined();
  });
});
