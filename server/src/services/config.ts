import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AppConfig, Tool } from '../types/index.js';
import { TOOL_DEFINITIONS } from '../types/index.js';

const DEFAULT_CONFIG: AppConfig = {
  skillRepoPath: '',
  tools: [],
  syncInterval: 30000,
  autoSync: false,
  theme: 'system',
};

export class ConfigService {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    const configDir = process.env.SKILL_SYNC_CONFIG_DIR || path.join(os.homedir(), '.skill-sync');
    this.configPath = path.join(configDir, 'config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(content) as Partial<AppConfig>;
        return { ...DEFAULT_CONFIG, ...loaded };
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): AppConfig {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    return this.getConfig();
  }

  getSkillRepoPath(): string {
    if (process.env.SKILL_SYNC_REPO_PATH) {
      return process.env.SKILL_SYNC_REPO_PATH;
    }
    if (this.config.skillRepoPath) {
      return this.config.skillRepoPath;
    }
    return path.join(os.homedir(), '.skill-sync', 'skills');
  }

  setSkillRepoPath(skillRepoPath: string): void {
    this.config.skillRepoPath = skillRepoPath;
    this.saveConfig();
  }

  ensureSkillRepoExists(): string {
    const skillRepoPath = this.getSkillRepoPath();
    if (!fs.existsSync(skillRepoPath)) {
      fs.mkdirSync(skillRepoPath, { recursive: true });
    }
    return skillRepoPath;
  }

  getToolDefinitions(): Omit<Tool, 'detected' | 'installed'>[] {
    return TOOL_DEFINITIONS;
  }
}

export const configService = new ConfigService();
