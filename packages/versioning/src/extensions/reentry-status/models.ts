export type ProjectPhase =
  | 'planning'
  | 'development'
  | 'testing'
  | 'staging'
  | 'production'
  | 'maintenance';

export type SyncTarget = 'files' | 'github' | 'obsidian';

export type ReentrySchemaVersion = '1.0' | '1.1';

export interface ReentryMilestoneLink {
  id: string;
  title: string;
}

export interface UpdateContext {
  trigger: 'manual' | 'postVersion' | 'postRelease' | 'auto';
  command?: string;
  options?: any;
  gitInfo: {
    branch: string;
    commit: string;
    author: string;
    timestamp: string;
  };
  versioningInfo: {
    versionType?: string;
    oldVersion?: string;
    newVersion?: string;
  };
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  dueDate?: string;
  completedDate?: string;
}

export interface Blocker {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  created: string;
  resolved?: boolean;
  resolutionDate?: string;
}

export interface NextStep {
  id: string;
  description: string;
  priority: number;
  estimatedEffort?: string;
  dependencies?: string[];
}

export interface Risk {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface Dependency {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'service';
  status: 'healthy' | 'degraded' | 'down';
  version?: string;
}

export interface ReentryStatus {
  schemaVersion: ReentrySchemaVersion;

  version: string;
  lastUpdated: string;
  updatedBy: string;
  context: UpdateContext;

  // Roadmap linkage (slow layer)
  milestone: ReentryMilestoneLink | null;
  roadmapFile: string;

  currentPhase: ProjectPhase;
  milestones: Milestone[];
  blockers: Blocker[];
  nextSteps: NextStep[];
  risks: Risk[];
  dependencies: Dependency[];

  versioning: {
    currentVersion: string;
    previousVersion: string;
    versionType: 'patch' | 'minor' | 'major';
    releaseDate?: string;
  };

  syncMetadata: {
    githubIssueId?: number;
    githubIssueUrl?: string;
    obsidianNotePath?: string;
    lastSyncAttempt: string;
    lastSuccessfulSync: string;

    // Optional hashes of last-published bodies for diff-based publishing
    published?: {
      githubIssueBodySha256?: string;
      obsidianNoteBodySha256?: string;
    };
  };
}

export interface GitHubConfig {
  enabled: boolean;
  owner: string;
  repo: string;
  issue: {
    title: string;
    labels: string[];
    assignees?: string[];
    template?: string;
  };
  auth: {
    token: string;
  };
}

export interface ObsidianConfig {
  enabled: boolean;
  vaultPath: string;
  notePath: string;
  template?: string;
  frontmatter?: Record<string, any>;
}

export interface CustomSection {
  id: string;
  title: string;
  renderer: (status: ReentryStatus) => string;
}

export interface ReentryStatusConfig {
  enabled: boolean;
  autoSync: boolean;
  failHard: boolean;

  hooks?: {
    postVersion?: boolean;
    postRelease?: boolean;
  };

  files: {
    jsonPath: string;
    markdownPath: string;
  };

  github?: GitHubConfig;
  obsidian?: ObsidianConfig;

  template?: {
    includeSections: string[];
    excludeSections: string[];
    customSections?: CustomSection[];
  };
}

export interface SyncResult {
  target: SyncTarget;
  success: boolean;
  timestamp: string;
  duration: number;
  details?: any;
  error?: {
    message: string;
    code?: string;
    recoverable: boolean;
  };
}

export interface ErrorContext {
  operation: string;
  component: string;
  severity: 'warning' | 'error' | 'fatal';
  recoverable: boolean;
  userAction?: string;
}
