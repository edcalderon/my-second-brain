import { Command } from 'commander';
import { execFileSync, execSync } from 'child_process';
import * as fs from 'fs-extra';
import { VersioningExtension } from '../../extensions';
import { VersionManager } from '../../versioning';
import { ChangelogManager } from '../../changelog';
import { SyncManager } from '../../sync';
import { ReleaseManager } from '../../release';

/**
 * The one piece the existing patch/minor/major commands didn't have:
 * opening a reviewable PR instead of committing/tagging straight onto the
 * checked-out branch. Everything else here (version bump, changelog
 * generation, changelog validation) reuses VersionManager/ChangelogManager/
 * ReleaseManager exactly as `versioning patch` does -- this just wraps
 * that in a release branch + `gh pr create`, and runs secrets-check first
 * as a hard gate (a release should never ship with a credential in it).
 *
 * No git tag is created here -- tagging (and any publish/deploy step)
 * belongs after the PR is reviewed and merged, not before. This
 * extension's job ends at "PR open, ready for human review."
 */

function run(cmd: string): string {
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

function runInherit(cmd: string): void {
  execSync(cmd, { stdio: 'inherit' });
}

// The currently-running CLI script's own path -- re-invoking through this
// (instead of a hardcoded 'dist/cli.js') is what makes 'versioning
// release-pr' work when run from a *consuming* repo (e.g. a-quant, which
// depends on @edcalderon/versioning from node_modules and has no local
// packages/versioning/dist of its own), not just from inside this
// package's own directory.
const CLI_ENTRYPOINT = process.argv[1];

// execFileSync + process.execPath, args as an array -- not a shell string
// -- so this can't break on a path containing a space or shell metachar,
// and always launches with the exact same node binary running right now.
function runCli(...args: string[]): void {
  execFileSync(process.execPath, [CLI_ENTRYPOINT, ...args], { stdio: 'inherit' });
}

async function loadConfig(configPath: string): Promise<any> {
  if (!(await fs.pathExists(configPath))) {
    throw new Error(`Config file not found: ${configPath}. Run 'versioning init' to create one.`);
  }
  return await fs.readJson(configPath);
}

function extractLatestChangelogSection(changelog: string, version: string): string {
  // CHANGELOG.md sections are "## <version> ..." headers -- grab everything
  // between the header for `version` and the next "## " header (or EOF).
  const lines = changelog.split('\n');
  const startIdx = lines.findIndex((l) => l.startsWith('## ') && l.includes(version));
  if (startIdx === -1) return '_(changelog section not found -- see CHANGELOG.md)_';
  let endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith('## '));
  if (endIdx === -1) endIdx = lines.length;
  return lines.slice(startIdx, endIdx).join('\n').trim();
}

async function runReleasePr(
  type: 'patch' | 'minor' | 'major',
  options: { base?: string; config?: string; dryRun?: boolean },
): Promise<void> {
  const status = run('git status --porcelain');
  if (status) {
    throw new Error('Working tree is not clean -- commit or stash changes before opening a release PR.');
  }

  const baseBranch = options.base || 'main';
  const startingBranch = run('git rev-parse --abbrev-ref HEAD');

  const config = await loadConfig(options.config || 'versioning.config.json');
  const rootPkgPath = config.rootPackageJson || 'package.json';
  const previousVersion = (await fs.readJson(rootPkgPath)).version as string;

  const branchName = `release/${type}-${previousVersion}-${Date.now()}`;

  console.log(`\n🔒 Running secrets-check before touching anything...`);
  try {
    runCli('check-secrets');
  } catch {
    throw new Error('secrets-check failed -- release blocked. Fix the finding(s) above before retrying.');
  }

  if (options.dryRun) {
    console.log(`\n[dry-run] Would create branch ${branchName} off ${baseBranch}, bump ${type}, generate changelog, and open a PR. Stopping here.`);
    return;
  }

  // Explicit start point (git checkout -b <new-branch> [<start-point>]) --
  // without it, the branch starts from whatever HEAD currently is, which
  // is only baseBranch by coincidence. Invoking this from a feature branch
  // with --base main would otherwise silently pull that branch's commits
  // into the release and compute the changelog against the wrong history.
  // Fetching origin/<base> first (not the possibly-stale local branch ref)
  // guarantees the release always starts from the actual latest base.
  runInherit(`git fetch origin ${baseBranch}`);
  runInherit(`git checkout -b ${branchName} origin/${baseBranch}`);

  try {
    const versionManager = new VersionManager(config);
    const changelogManager = new ChangelogManager(config);
    const syncManager = new SyncManager(config);
    const releaseManager = new ReleaseManager({
      versionManager,
      changelogManager,
      syncManager,
      createTag: false,
      createCommit: true,
      publish: false,
    });

    console.log(`\n📦 Running readme-maintainer update-readme...`);
    try {
      runCli('update-readme');
    } catch (err) {
      console.warn('⚠️  update-readme failed, continuing without it:', err instanceof Error ? err.message : String(err));
    }

    console.log(`\n🧹 Running cleanup-repo...`);
    try {
      runCli('cleanup', 'move');
    } catch (err) {
      console.warn('⚠️  cleanup-repo failed or is not configured, continuing:', err instanceof Error ? err.message : String(err));
    }

    let newVersion: string;
    if (type === 'minor') newVersion = await releaseManager.minorRelease();
    else if (type === 'major') newVersion = await releaseManager.majorRelease();
    else newVersion = await releaseManager.patchRelease();

    runInherit(`git push -u origin ${branchName}`);

    const changelogContent = await fs.readFile(changelogManager.getChangelogPath(), 'utf-8');
    const section = extractLatestChangelogSection(changelogContent, newVersion);
    const prBodyPath = `/tmp/release-pr-body-${Date.now()}.md`;
    await fs.writeFile(
      prBodyPath,
      `## Release: v${previousVersion} → v${newVersion}\n\n${section}\n\n---\n_Opened by \`versioning release-pr\` (@edcalderon/versioning). ` +
      `secrets-check passed, no tag created yet -- tagging/publish happens after this is reviewed and merged._\n`,
    );

    console.log(`\n🚀 Opening PR against ${baseBranch}...`);
    runInherit(`gh pr create --title "release: v${newVersion}" --body-file ${prBodyPath} --base ${baseBranch} --head ${branchName}`);

    console.log(`\n✅ Release PR opened: v${previousVersion} → v${newVersion} (${branchName} → ${baseBranch})`);
  } catch (err) {
    console.error(`\n❌ Release PR flow failed, switching back to ${startingBranch}.`);
    try {
      runInherit(`git checkout ${startingBranch}`);
    } catch {
      // best-effort only
    }
    throw err;
  }
}

const extension: VersioningExtension = {
  name: 'release-pr',
  description: 'Bump version, generate changelog, and open a release PR for review (no tag/publish until merged)',
  version: '1.0.0',
  register: async (program: Command) => {
    program
      .command('release-pr [type]')
      .description('Open a release PR (patch/minor/major, default patch)')
      .option('--base <branch>', 'base branch to PR against', 'main')
      .option('-c, --config <file>', 'config file path', 'versioning.config.json')
      .option('--dry-run', 'run secrets-check and print what would happen without creating a branch/PR')
      .action(async (type: string = 'patch', options: any) => {
        try {
          await runReleasePr(type as 'patch' | 'minor' | 'major', options);
        } catch (error) {
          console.error('❌ Error:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });
  },
};

export default extension;
