const conventionalChangelog = require('conventional-changelog');
const stream = conventionalChangelog(
  { preset: 'angular', tagPrefix: 'versioning-v' },
  undefined,
  { path: process.cwd() }
);
stream.pipe(process.stdout);
