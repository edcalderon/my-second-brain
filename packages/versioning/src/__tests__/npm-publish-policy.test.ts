const { assertNpmPublishAuthorized, isPublicNpmRegistry } = require('../../scripts/guard-npm-publish');
const { validateReleaseMetadata } = require('../../scripts/verify-release-metadata');

describe('npm publish policy', () => {
  const version = '1.5.13';

  it('blocks manual publishing to npmjs.org unless explicitly approved', () => {
    expect(() => assertNpmPublishAuthorized({}, version)).toThrow('restricted to the "Publish Versioning to NPM" GitHub Actions workflow');
    expect(() => assertNpmPublishAuthorized({ ALLOW_MANUAL_NPM_PUBLISH: '1' }, version)).toThrow('MANUAL_PUBLISH_CONFIRM');
    expect(() => assertNpmPublishAuthorized({
      ALLOW_MANUAL_NPM_PUBLISH: '1',
      MANUAL_PUBLISH_CONFIRM: `@edcalderon/versioning@${version}`
    }, version)).not.toThrow();
  });

  it('allows the tagged publish workflow and local registries', () => {
    expect(() => assertNpmPublishAuthorized({
      GITHUB_ACTIONS: 'true',
      VERSIONING_ACTION_PUBLISH: 'true',
      GITHUB_WORKFLOW: 'Publish Versioning to NPM',
      GITHUB_REF: `refs/tags/versioning-v${version}`
    }, version)).not.toThrow();
    expect(() => assertNpmPublishAuthorized({ npm_config_registry: 'http://localhost:4873' }, version)).not.toThrow();
    expect(isPublicNpmRegistry('https://registry.npmjs.org/')).toBe(true);
  });

  it('requires the tag and README release section to match the package version', () => {
    expect(validateReleaseMetadata({
      version,
      tagName: `versioning-v${version}`,
      readme: `# Versioning\n\n## 📋 Latest Changes (v${version})\n`
    })).toEqual([]);

    expect(validateReleaseMetadata({
      version,
      tagName: 'versioning-v1.5.12',
      readme: '# Versioning\n'
    }).join('\n')).toContain('README.md must include');
  });
});
