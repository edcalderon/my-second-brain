import { GitHubClient, GitHubIssue } from './github-sync-adapter';

export class GitHubRestClient implements GitHubClient {
  constructor(private readonly token: string) {}

  private async request<T>(method: string, url: string, body?: any): Promise<T> {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status} ${res.statusText}: ${text}`);
    }

    return (await res.json()) as T;
  }

  async findIssueByTitle(params: { owner: string; repo: string; title: string }): Promise<GitHubIssue | null> {
    // Minimal approach: list open issues and match exact title.
    // (Avoid Search API auth/perms complexity; keep behavior deterministic.)
    const url = `https://api.github.com/repos/${params.owner}/${params.repo}/issues?state=open&per_page=100`;
    const issues = await this.request<any[]>('GET', url);

    const match = issues.find((i) => typeof i?.title === 'string' && i.title === params.title);
    if (!match) return null;

    return {
      id: Number(match.number),
      url: String(match.html_url ?? ''),
      title: String(match.title),
      body: String(match.body ?? '')
    };
  }

  async createIssue(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    labels: string[];
    assignees?: string[];
  }): Promise<GitHubIssue> {
    const url = `https://api.github.com/repos/${params.owner}/${params.repo}/issues`;
    const created = await this.request<any>('POST', url, {
      title: params.title,
      body: params.body,
      labels: params.labels,
      assignees: params.assignees
    });

    return {
      id: Number(created.number),
      url: String(created.html_url ?? ''),
      title: String(created.title),
      body: String(created.body ?? '')
    };
  }

  async updateIssue(params: {
    owner: string;
    repo: string;
    issueId: number;
    title?: string;
    body: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<GitHubIssue> {
    const url = `https://api.github.com/repos/${params.owner}/${params.repo}/issues/${params.issueId}`;
    const updated = await this.request<any>('PATCH', url, {
      title: params.title,
      body: params.body,
      labels: params.labels,
      assignees: params.assignees
    });

    return {
      id: Number(updated.number),
      url: String(updated.html_url ?? ''),
      title: String(updated.title),
      body: String(updated.body ?? '')
    };
  }
}
