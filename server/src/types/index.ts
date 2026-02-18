export interface Tool {
  id: string;
  name: string;
  displayName: string;
  category: 'cli' | 'ide' | 'vscode' | 'jetbrains';
  skillPath: string;
  configPath?: string;
  detected: boolean;
  installed: boolean;
  icon?: string;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  files: SkillFile[];
  createdAt: string;
  updatedAt: string;
  version: number;
  sourceTool?: string;
}

export interface SkillFile {
  name: string;
  path: string;
  size: number;
  hash: string;
  content?: string;
}

export interface SyncStatus {
  toolId: string;
  skillId: string;
  syncedAt: string;
  status: 'synced' | 'pending' | 'conflict' | 'error';
  method: 'symlink' | 'copy';
  error?: string;
}

export interface MergePreview {
  skillName: string;
  sourceTool: string;
  targetPath: string;
  files: MergeFile[];
  conflicts: ConflictInfo[];
}

export interface MergeFile {
  name: string;
  sourcePath: string;
  targetPath: string;
  action: 'create' | 'skip' | 'overwrite';
  exists: boolean;
}

export interface ConflictInfo {
  fileName: string;
  sourceHash: string;
  targetHash: string;
  autoResolvable: boolean;
}

export interface AppConfig {
  skillRepoPath: string;
  tools: Tool[];
  syncInterval: number;
  autoSync: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export const TOOL_DEFINITIONS: Omit<Tool, 'detected' | 'installed'>[] = [
  {
    id: 'claude-code',
    name: 'claude-code',
    displayName: 'Claude Code',
    category: 'cli',
    skillPath: '.claude/skills',
    icon: 'claude',
  },
  {
    id: 'cursor',
    name: 'cursor',
    displayName: 'Cursor',
    category: 'ide',
    skillPath: '.cursor/skills',
    icon: 'cursor',
  },
  {
    id: 'windsurf',
    name: 'windsurf',
    displayName: 'Windsurf',
    category: 'ide',
    skillPath: '.windsurf/skills',
    icon: 'windsurf',
  },
  {
    id: 'trae',
    name: 'trae',
    displayName: 'Trae',
    category: 'ide',
    skillPath: '.trae/skills',
    icon: 'trae',
  },
  {
    id: 'kiro',
    name: 'kiro',
    displayName: 'Kiro',
    category: 'ide',
    skillPath: '.kiro/skills',
    icon: 'kiro',
  },
  {
    id: 'gemini-cli',
    name: 'gemini-cli',
    displayName: 'Gemini CLI',
    category: 'cli',
    skillPath: '.gemini/skills',
    icon: 'gemini',
  },
  {
    id: 'copilot',
    name: 'copilot',
    displayName: 'GitHub Copilot',
    category: 'vscode',
    skillPath: '.github/copilot/skills',
    configPath: '.vscode/settings.json',
    icon: 'github',
  },
  {
    id: 'codex',
    name: 'codex',
    displayName: 'OpenAI Codex',
    category: 'cli',
    skillPath: '.codex/skills',
    icon: 'openai',
  },
  {
    id: 'aider',
    name: 'aider',
    displayName: 'Aider',
    category: 'cli',
    skillPath: '.aider/skills',
    icon: 'aider',
  },
  {
    id: 'continue',
    name: 'continue',
    displayName: 'Continue',
    category: 'vscode',
    skillPath: '.continue/skills',
    icon: 'continue',
  },
  {
    id: 'cline',
    name: 'cline',
    displayName: 'Cline',
    category: 'vscode',
    skillPath: '.cline/skills',
    icon: 'cline',
  },
  {
    id: 'roo-code',
    name: 'roo-code',
    displayName: 'Roo Code',
    category: 'vscode',
    skillPath: '.roo/skills',
    icon: 'roo',
  },
  {
    id: 'amazon-q',
    name: 'amazon-q',
    displayName: 'Amazon Q',
    category: 'vscode',
    skillPath: '.amazonq/skills',
    icon: 'amazon',
  },
  {
    id: 'jetbrains-ai',
    name: 'jetbrains-ai',
    displayName: 'JetBrains AI',
    category: 'jetbrains',
    skillPath: '.jetbrains/ai/skills',
    icon: 'jetbrains',
  },
];
