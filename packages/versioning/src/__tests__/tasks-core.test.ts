jest.unmock('fs-extra');

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import {
  archiveTaskFile,
  buildTaskSyncMetadata,
  renderTaskReadmeIndex,
  scanTaskWorkspace,
  setTaskStatus,
  validateTaskWorkspace,
  validateTaskSpecs
} from '../extensions/tasks/core';

let tmpDir: string;
let previousCwd: string;

beforeEach(async () => {
  previousCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'versioning-tasks-core-'));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(previousCwd);
  if (tmpDir && await fs.pathExists(tmpDir)) {
    await fs.remove(tmpDir);
  }
});

async function createTaskFile(relativePath: string, content: string): Promise<void> {
  const absolutePath = path.join(tmpDir, relativePath);
  await fs.ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, content);
}

describe('tasks core helpers', () => {
  it('scans task folders and recognizes feature specs', async () => {
    await createTaskFile('.agents/active-tasks/wallet/00-SPEC.md', `# Wallet Feature

## Goal

- Ship a wallet flow

## Tasks

- [ ] Build the UI

## Acceptance Criteria

- [ ] Users can create a wallet
`);
    await createTaskFile('.agents/active-tasks/wallet/01-build-ui.md', `# Build UI

Status: active

## Acceptance Criteria

- [ ] The UI renders
`);
    await createTaskFile('.agents/pending-tasks/wallet/SEC-001-review.md', `# Security Review

Status: pending

## Acceptance Criteria

- [ ] Review the wallet flow
`);
    await createTaskFile('.agents/done-tasks/wallet/01-ship.md', `# Ship Wallet

Status: done

## Acceptance Criteria

- [x] Release shipped
`);

    const snapshot = await scanTaskWorkspace(tmpDir);
    expect(snapshot.counts.active).toBe(1);
    expect(snapshot.counts.pending).toBe(1);
    expect(snapshot.counts.done).toBe(1);
    expect(snapshot.counts.specs).toBe(1);
    expect(snapshot.groups).toHaveLength(3);

    const activeGroup = snapshot.groups.find((group) => group.category === 'active' && group.feature === 'wallet');
    expect(activeGroup).toBeDefined();
    expect(activeGroup?.files.some((entry) => entry.isSpec)).toBe(true);
    expect(activeGroup?.files.some((entry) => entry.title === 'Build UI')).toBe(true);

    const specWarnings = validateTaskSpecs(snapshot);
    expect(specWarnings).toHaveLength(0);
  });

  it('renders deterministic feature README content and changes the snapshot hash when tasks change', async () => {
    await createTaskFile('.agents/active-tasks/wallet/00-SPEC.md', `# Wallet Feature

## Goal

- Ship a wallet flow

## Tasks

- [ ] Build the UI

## Acceptance Criteria

- [ ] Users can create a wallet
`);
    await createTaskFile('.agents/active-tasks/wallet/01-build-ui.md', `# Build UI

Status: active

## Acceptance Criteria

- [ ] The UI renders
`);

    const first = await scanTaskWorkspace(tmpDir);
    const activeGroup = first.groups.find((group) => group.category === 'active' && group.feature === 'wallet');
    expect(activeGroup).toBeDefined();

    const readme = renderTaskReadmeIndex(first, activeGroup!);
    expect(readme).toContain('# wallet');
    expect(readme).toContain('00-SPEC.md');
    expect(readme).toContain('Build UI');

    const firstHash = buildTaskSyncMetadata(first).snapshotHash;

    await createTaskFile('.agents/active-tasks/wallet/02-more-work.md', `# More Work

Status: active

## Acceptance Criteria

- [ ] More work lands
`);

    const second = await scanTaskWorkspace(tmpDir);
    const secondHash = buildTaskSyncMetadata(second).snapshotHash;
    expect(secondHash).not.toBe(firstHash);
  });

  it('archives active tasks into done-tasks and updates the status header', async () => {
    await createTaskFile('.agents/active-tasks/wallet/01-build-ui.md', `# Build UI

Status: active

## Acceptance Criteria

- [ ] The UI renders
`);

    await archiveTaskFile(tmpDir, '.agents/active-tasks/wallet/01-build-ui.md');

    expect(await fs.pathExists(path.join(tmpDir, '.agents/active-tasks/wallet/01-build-ui.md'))).toBe(false);
    const archived = await fs.readFile(path.join(tmpDir, '.agents/done-tasks/wallet/01-build-ui.md'), 'utf8');
    expect(archived).toContain('Status: done');
  });

  it('updates a task status header when one is present', () => {
    const next = setTaskStatus(`# Build UI\n\nStatus: active\n\n## Acceptance Criteria\n`, 'done');
    expect(next).toContain('Status: done');
  });

  it('detects stale readmes and missing reentry snapshot metadata', async () => {
    await createTaskFile('.agents/active-tasks/wallet/01-build-ui.md', `# Build UI

Status: active

## Acceptance Criteria

- [ ] The UI renders
`);
    await createTaskFile('.agents/active-tasks/wallet/README.md', '# stale\n');

    const result = await validateTaskWorkspace(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('snapshot');
    expect(result.errors.join('\n')).toContain('README');
  });
});
