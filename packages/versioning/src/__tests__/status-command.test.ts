import { StatusManager } from '../status';

describe('StatusManager', () => {
  const mockConfig = {
    rootPackageJson: 'package.json',
    packages: ['apps/dashboard', 'apps/docs'],
    changelogFile: 'CHANGELOG.md',
    conventionalCommits: true
  };

  describe('constructor', () => {
    test('should create instance with config', () => {
      const manager = new StatusManager(mockConfig);
      expect(manager).toBeDefined();
    });
  });

  describe('formatStatus', () => {
    test('should format status as JSON when requested', () => {
      const manager = new StatusManager(mockConfig);
      const mockReport = {
        installation: {
          cliVersion: '1.3.1',
          nodeVersion: 'v20.0.0',
          packageManager: 'pnpm',
          configPath: './versioning.config.json',
          configValid: true,
          gitBranch: 'main',
          gitStatus: 'clean' as const
        },
        versionFreshness: {
          currentVersion: '1.2.3',
          latestVersion: '1.2.3',
          updateAvailable: false
        },
        syncHealth: {
          packages: [],
          allInSync: true,
          totalPackages: 0,
          packagesInSync: 0,
          packagesOutOfSync: 0
        }
      };

      const output = manager.formatStatus(mockReport, { json: true });
      expect(() => JSON.parse(output)).not.toThrow();
      const parsed = JSON.parse(output);
      expect(parsed.installation).toBeDefined();
      expect(parsed.versionFreshness).toBeDefined();
      expect(parsed.syncHealth).toBeDefined();
    });

    test('should format status as human-readable text', () => {
      const manager = new StatusManager(mockConfig);
      const mockReport = {
        installation: {
          cliVersion: '1.3.1',
          nodeVersion: 'v20.0.0',
          packageManager: 'pnpm',
          configPath: './versioning.config.json',
          configValid: true,
          gitBranch: 'main',
          gitStatus: 'clean' as const
        },
        versionFreshness: {
          currentVersion: '1.2.3',
          latestVersion: '1.2.3',
          updateAvailable: false
        },
        syncHealth: {
          packages: [{
            name: 'app1',
            path: 'apps/app1',
            version: '1.2.3',
            inSync: true
          }],
          allInSync: true,
          totalPackages: 1,
          packagesInSync: 1,
          packagesOutOfSync: 0
        }
      };

      const output = manager.formatStatus(mockReport);
      expect(output).toContain('Versioning CLI: 1.3.1');
      expect(output).toContain('Node.js: v20.0.0');
      expect(output).toContain('Package manager: pnpm');
      expect(output).toContain('Sync status:');
      expect(output).toContain('Dependency graph');
    });

    test('should show update available when newer version exists', () => {
      const manager = new StatusManager(mockConfig);
      const mockReport = {
        installation: {
          cliVersion: '1.2.3',
          nodeVersion: 'v20.0.0',
          packageManager: 'pnpm',
          configPath: './versioning.config.json',
          configValid: true,
          gitBranch: 'main',
          gitStatus: 'clean' as const
        },
        versionFreshness: {
          currentVersion: '1.2.3',
          latestVersion: '1.3.0',
          updateAvailable: true,
          updateType: 'minor' as const
        },
        syncHealth: {
          packages: [],
          allInSync: true,
          totalPackages: 0,
          packagesInSync: 0,
          packagesOutOfSync: 0
        }
      };

      const output = manager.formatStatus(mockReport);
      expect(output).toContain('Latest available: 1.3.0');
      expect(output).toContain('update available: minor');
    });

    test('should not show update line when version is current', () => {
      const manager = new StatusManager(mockConfig);
      const mockReport = {
        installation: {
          cliVersion: '1.2.3',
          nodeVersion: 'v20.0.0',
          packageManager: 'pnpm',
          configPath: './versioning.config.json',
          configValid: true,
          gitBranch: 'main',
          gitStatus: 'clean' as const
        },
        versionFreshness: {
          currentVersion: '1.2.3',
          latestVersion: '1.2.3',
          updateAvailable: false
        },
        syncHealth: {
          packages: [],
          allInSync: true,
          totalPackages: 0,
          packagesInSync: 0,
          packagesOutOfSync: 0
        }
      };

      const output = manager.formatStatus(mockReport);
      expect(output).not.toContain('Latest available:');
    });

    test('should mark out-of-sync packages with ✗', () => {
      const manager = new StatusManager(mockConfig);
      const mockReport = {
        installation: {
          cliVersion: '1.2.3',
          nodeVersion: 'v20.0.0',
          packageManager: 'pnpm',
          configPath: './versioning.config.json',
          configValid: true,
          gitBranch: 'main',
          gitStatus: 'clean' as const
        },
        versionFreshness: {
          currentVersion: '1.2.3',
          latestVersion: '1.2.3',
          updateAvailable: false
        },
        syncHealth: {
          packages: [
            {
              name: 'app1',
              path: 'apps/app1',
              version: '1.2.3',
              inSync: true
            },
            {
              name: 'app2',
              path: 'apps/app2',
              version: '1.2.2',
              inSync: false
            }
          ],
          allInSync: false,
          totalPackages: 2,
          packagesInSync: 1,
          packagesOutOfSync: 1
        }
      };

      const output = manager.formatStatus(mockReport);
      expect(output).toContain('✗');
      expect(output).toContain('out of sync');
    });
  });
});
