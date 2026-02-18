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

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export const api = {
  health: () => fetchApi<{ status: string; timestamp: string; version: string }>('/health'),

  tools: {
    list: () => fetchApi<Tool[]>('/tools'),
    get: (id: string) => fetchApi<Tool>(`/tools/${id}`),
  },

  skills: {
    list: () => fetchApi<Skill[]>('/skills'),
    get: (id: string) => fetchApi<Skill>(`/skills/${id}`),
    create: (name: string, description?: string, sourceTool?: string) =>
      fetchApi<Skill>('/skills', {
        method: 'POST',
        body: JSON.stringify({ name, description, sourceTool }),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/skills/${id}`, { method: 'DELETE' }),
    getFile: (skillId: string, filePath: string) =>
      fetchApi<string>(`/skills/${skillId}/files/${encodeURIComponent(filePath)}`),
    updateFile: (skillId: string, filePath: string, content: string) =>
      fetchApi<void>(`/skills/${skillId}/files/${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
  },

  config: {
    get: () => fetchApi<AppConfig>('/config'),
    update: (updates: Partial<AppConfig>) =>
      fetchApi<AppConfig>('/config', {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
  },

  sync: {
    status: () => fetchApi<SyncStatus[]>('/sync/status'),
  },
};
