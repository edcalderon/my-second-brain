import { BranchAwareManager, createDefaultBranchAwarenessConfig, BranchConfig } from '../branch-aware';
import simpleGit from 'simple-git';

jest.mock('simple-git');

describe('BranchAwareManager', () => {
  let branchAwareManager: BranchAwareManager;
  let mockGit: any;

  beforeEach(() => {
    mockGit = {
      status: jest.fn()
    };
    (simpleGit as jest.Mock).mockReturnValue(mockGit);

    const config = createDefaultBranchAwarenessConfig();
    config.enabled = true;
    branchAwareManager = new BranchAwareManager(config);
  });

  describe('getCurrentBranch', () => {
    it('should return current branch from git status', async () => {
      mockGit.status.mockResolvedValue({ current: 'develop' });
      const branch = await branchAwareManager.getCurrentBranch();
      expect(branch).toBe('develop');
    });

    it('should default to main if no current branch', async () => {
      mockGit.status.mockResolvedValue({ current: null });
      const branch = await branchAwareManager.getCurrentBranch();
      expect(branch).toBe('main');
    });
  });

  describe('detectBranchConfig', () => {
    it('should return exact branch config for main branch', async () => {
      mockGit.status.mockResolvedValue({ current: 'main' });
      const config = await branchAwareManager.detectBranchConfig();
      
      expect(config.versionFormat).toBe('semantic');
      expect(config.environment).toBe('production');
      expect(config.bumpStrategy).toBe('semantic');
    });

    it('should return exact branch config for develop branch', async () => {
      mockGit.status.mockResolvedValue({ current: 'develop' });
      const config = await branchAwareManager.detectBranchConfig();
      
      expect(config.versionFormat).toBe('dev');
      expect(config.environment).toBe('development');
      expect(config.bumpStrategy).toBe('dev-build');
    });

    it('should match feature/* pattern', async () => {
      mockGit.status.mockResolvedValue({ current: 'feature/new-ui' });
      const config = await branchAwareManager.detectBranchConfig();
      
      expect(config.versionFormat).toBe('feature');
      expect(config.bumpStrategy).toBe('feature-branch');
    });

    it('should match hotfix/* pattern', async () => {
      mockGit.status.mockResolvedValue({ current: 'hotfix/critical-bug' });
      const config = await branchAwareManager.detectBranchConfig();
      
      expect(config.versionFormat).toBe('hotfix');
      expect(config.bumpStrategy).toBe('hotfix');
    });

    it('should use target branch when provided', async () => {
      const config = await branchAwareManager.detectBranchConfig('main');
      expect(config.versionFormat).toBe('semantic');
    });

    it('should fallback to default branch config for unknown branch', async () => {
      mockGit.status.mockResolvedValue({ current: 'unknown-branch' });
      const config = await branchAwareManager.detectBranchConfig();
      
      // Should fallback to main (default branch)
      expect(config.versionFormat).toBe('semantic');
    });
  });

  describe('formatVersion', () => {
    const mainConfig: BranchConfig = {
      versionFormat: 'semantic',
      tagFormat: 'v{version}',
      syncFiles: ['package.json'],
      environment: 'production',
      bumpStrategy: 'semantic'
    };

    const devConfig: BranchConfig = {
      versionFormat: 'dev',
      tagFormat: 'v{version}',
      syncFiles: ['version.development.json'],
      environment: 'development',
      bumpStrategy: 'dev-build'
    };

    const featureConfig: BranchConfig = {
      versionFormat: 'feature',
      tagFormat: 'v{version}',
      syncFiles: ['version.development.json'],
      environment: 'development',
      bumpStrategy: 'feature-branch'
    };

    it('should format semantic version for main branch', async () => {
      mockGit.status.mockResolvedValue({ current: 'main' });
      const version = await branchAwareManager.formatVersion('1.8.172', mainConfig, 'main');
      expect(version).toBe('1.8.172');
    });

    it('should format dev version with build number', async () => {
      mockGit.status.mockResolvedValue({ current: 'develop' });
      const version = await branchAwareManager.formatVersion('1.8.172', devConfig, 'develop', 395);
      expect(version).toBe('1.8.172-dev.395');
    });

    it('should format feature version with branch name', async () => {
      mockGit.status.mockResolvedValue({ current: 'feature/new-ui' });
      const version = await branchAwareManager.formatVersion('1.8.172', featureConfig, 'feature/new-ui', 10);
      expect(version).toBe('1.8.172-feature/new-ui.10');
    });
  });

  describe('bumpVersionBranchAware', () => {
    it('should bump semantic version on main branch', async () => {
      mockGit.status.mockResolvedValue({ current: 'main' });
      const config = await branchAwareManager.detectBranchConfig();
      const newVersion = await branchAwareManager.bumpVersionBranchAware(
        '1.8.172',
        'patch',
        config,
        'main'
      );
      expect(newVersion).toBe('1.8.173');
    });

    it('should create dev version on develop branch', async () => {
      mockGit.status.mockResolvedValue({ current: 'develop' });
      const config = await branchAwareManager.detectBranchConfig();
      const newVersion = await branchAwareManager.bumpVersionBranchAware(
        '1.8.172',
        'patch',
        config,
        'develop',
        1
      );
      expect(newVersion).toBe('1.8.172-dev.1');
    });

    it('should preserve base version for dev builds', async () => {
      mockGit.status.mockResolvedValue({ current: 'develop' });
      const config = await branchAwareManager.detectBranchConfig();
      
      // First bump
      const version1 = await branchAwareManager.bumpVersionBranchAware(
        '1.8.172',
        'patch',
        config,
        'develop',
        1
      );
      expect(version1).toBe('1.8.172-dev.1');
      
      // Second bump should keep same base version
      const version2 = await branchAwareManager.bumpVersionBranchAware(
        version1,
        'patch',
        config,
        'develop',
        2
      );
      expect(version2).toBe('1.8.172-dev.2');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(branchAwareManager.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const config = createDefaultBranchAwarenessConfig();
      config.enabled = false;
      const manager = new BranchAwareManager(config);
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe('getSyncFiles', () => {
    it('should return sync files from branch config', async () => {
      mockGit.status.mockResolvedValue({ current: 'main' });
      const config = await branchAwareManager.detectBranchConfig();
      const syncFiles = branchAwareManager.getSyncFiles(config);
      
      expect(syncFiles).toContain('package.json');
      expect(syncFiles).toContain('version.production.json');
    });
  });
});

describe('createDefaultBranchAwarenessConfig', () => {
  it('should create default configuration', () => {
    const config = createDefaultBranchAwarenessConfig();
    
    expect(config.enabled).toBe(false);
    expect(config.defaultBranch).toBe('main');
    expect(config.branches.main).toBeDefined();
    expect(config.branches.develop).toBeDefined();
    expect(config.branches['feature/*']).toBeDefined();
    expect(config.branches['hotfix/*']).toBeDefined();
  });

  it('should have correct main branch config', () => {
    const config = createDefaultBranchAwarenessConfig();
    const mainConfig = config.branches.main;
    
    expect(mainConfig.versionFormat).toBe('semantic');
    expect(mainConfig.environment).toBe('production');
    expect(mainConfig.syncFiles).toContain('package.json');
  });

  it('should have correct develop branch config', () => {
    const config = createDefaultBranchAwarenessConfig();
    const devConfig = config.branches.develop;
    
    expect(devConfig.versionFormat).toBe('dev');
    expect(devConfig.environment).toBe('development');
    expect(devConfig.syncFiles).toContain('version.development.json');
  });
});
