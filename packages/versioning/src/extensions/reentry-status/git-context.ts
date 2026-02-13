import simpleGit from 'simple-git';

export interface GitContextInfo {
    branch: string;
    commit: string;
    commitMessage: string;
    author: string;
    timestamp: string;
    changedFiles: string[];
    diffSummary: {
        insertions: number;
        deletions: number;
        filesChanged: number;
    };
}

/**
 * Collects the current git context automatically from the working directory.
 * This is used to auto-fill the reentry status with real git data.
 */
export async function collectGitContext(): Promise<GitContextInfo> {
    const git = simpleGit();

    try {
        const [log, branch, diff] = await Promise.all([
            git.log({ maxCount: 1 }),
            git.branch(),
            git.diffSummary(['HEAD~1', 'HEAD']).catch(() => null),
        ]);

        const latest = log.latest;
        const statusResult = await git.status();

        return {
            branch: branch.current || '',
            commit: latest?.hash?.substring(0, 7) || '',
            commitMessage: latest?.message || '',
            author: latest?.author_name || '',
            timestamp: latest?.date || new Date().toISOString(),
            changedFiles: statusResult.files.map(f => f.path),
            diffSummary: {
                insertions: diff?.insertions ?? 0,
                deletions: diff?.deletions ?? 0,
                filesChanged: diff?.changed ?? 0,
            },
        };
    } catch {
        return {
            branch: '',
            commit: '',
            commitMessage: '',
            author: '',
            timestamp: new Date().toISOString(),
            changedFiles: [],
            diffSummary: { insertions: 0, deletions: 0, filesChanged: 0 },
        };
    }
}

/**
 * Infer the current project phase based on git data and recent changes.
 */
export function inferPhase(context: GitContextInfo, currentVersion: string): string {
    const msg = context.commitMessage.toLowerCase();

    if (msg.startsWith('fix:') || msg.startsWith('hotfix:') || msg.includes('bugfix')) {
        return 'maintenance';
    }
    if (msg.startsWith('test:') || msg.includes('test')) {
        return 'testing';
    }
    if (msg.startsWith('feat:') || msg.startsWith('feature:')) {
        return 'development';
    }
    if (msg.startsWith('chore: release') || msg.includes('deploy') || msg.includes('staging')) {
        return 'staging';
    }
    if (msg.startsWith('docs:') || msg.startsWith('chore:')) {
        return 'maintenance';
    }

    return 'development';
}

/**
 * Generate a suggested next step based on the last commit context.
 */
export function suggestNextStep(context: GitContextInfo): string {
    const msg = context.commitMessage.toLowerCase();

    if (msg.startsWith('feat:')) {
        return `Write tests for: ${context.commitMessage.replace(/^feat:\s*/i, '').substring(0, 60)}`;
    }
    if (msg.startsWith('fix:')) {
        return `Verify fix and add regression test for: ${context.commitMessage.replace(/^fix:\s*/i, '').substring(0, 50)}`;
    }
    if (msg.startsWith('test:')) {
        return 'Review test coverage and consider edge cases';
    }
    if (msg.startsWith('chore: release')) {
        return 'Verify deployment and update documentation';
    }
    if (msg.startsWith('docs:')) {
        return 'Continue with next feature or bugfix';
    }

    return `Review changes from: ${context.commitMessage.substring(0, 60)}`;
}
