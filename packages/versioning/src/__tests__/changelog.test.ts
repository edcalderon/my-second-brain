import { ChangelogManager } from '../changelog';

describe('ChangelogManager', () => {
  let changelogManager: ChangelogManager;

  beforeEach(() => {
    changelogManager = new ChangelogManager();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(changelogManager).toBeDefined();
    });
  });

  // Integration tests would require mocking conventional-changelog
  // For now, we'll test the basic functionality
});