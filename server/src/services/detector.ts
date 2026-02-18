import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import type { Tool } from '../types/index.js';
import { TOOL_DEFINITIONS } from '../types/index.js';

export class ToolDetector {
  private homeDir: string;

  constructor() {
    this.homeDir = os.homedir();
  }

  detectAll(): Tool[] {
    return TOOL_DEFINITIONS.map((def) => this.detectTool(def));
  }

  private detectTool(def: Omit<Tool, 'detected' | 'installed'>): Tool {
    const skillPath = path.join(this.homeDir, def.skillPath);
    const detected = this.isToolDetected(def);
    const installed = fs.existsSync(skillPath);

    return {
      ...def,
      detected,
      installed,
    };
  }

  private isToolDetected(def: Omit<Tool, 'detected' | 'installed'>): boolean {
    switch (def.category) {
      case 'cli':
        return this.isCliToolDetected(def.name);
      case 'ide':
        return this.isIdeDetected(def.name);
      case 'vscode':
        return this.isVscodeExtensionDetected(def.name);
      case 'jetbrains':
        return this.isJetbrainsPluginDetected(def.name);
      default:
        return false;
    }
  }

  private isCliToolDetected(name: string): boolean {
    const commands: Record<string, string[]> = {
      'claude-code': ['claude', 'claude-code'],
      'gemini-cli': ['gemini', 'gemini-cli'],
      codex: ['codex'],
      aider: ['aider', 'aider-chat'],
    };

    const cmds = commands[name] || [name];
    for (const cmd of cmds) {
      try {
        execSync(`where ${cmd} 2>nul`, { encoding: 'utf-8', timeout: 5000 });
        return true;
      } catch {
        try {
          execSync(`which ${cmd} 2>/dev/null`, { encoding: 'utf-8', timeout: 5000 });
          return true;
        } catch {
          continue;
        }
      }
    }
    return false;
  }

  private isIdeDetected(name: string): boolean {
    const idePaths: Record<string, string[]> = {
      cursor: [
        path.join(this.homeDir, 'AppData', 'Local', 'Programs', 'cursor'),
        path.join(this.homeDir, '.cursor'),
        '/Applications/Cursor.app',
        '/usr/local/bin/cursor',
      ],
      windsurf: [
        path.join(this.homeDir, 'AppData', 'Local', 'Programs', 'windsurf'),
        path.join(this.homeDir, '.windsurf'),
        '/Applications/Windsurf.app',
      ],
      trae: [
        path.join(this.homeDir, 'AppData', 'Local', 'Programs', 'trae'),
        path.join(this.homeDir, '.trae'),
      ],
      kiro: [
        path.join(this.homeDir, 'AppData', 'Local', 'Programs', 'kiro'),
        path.join(this.homeDir, '.kiro'),
      ],
    };

    const paths = idePaths[name] || [];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return true;
      }
    }
    return false;
  }

  private isVscodeExtensionDetected(name: string): boolean {
    const vscodeExtensionsPath = path.join(
      this.homeDir,
      process.platform === 'win32' ? '.vscode' : '.vscode',
      'extensions'
    );

    if (!fs.existsSync(vscodeExtensionsPath)) {
      return false;
    }

    const extensionPatterns: Record<string, string[]> = {
      copilot: ['github.copilot'],
      continue: ['continue.continue'],
      cline: ['saoudrizwan.claude-dev'],
      'roo-code': ['rooveterinaryinc.roo-cline'],
      'amazon-q': ['amazonwebservices.amazon-q-vscode'],
    };

    const patterns = extensionPatterns[name] || [];
    try {
      const extensions = fs.readdirSync(vscodeExtensionsPath);
      return patterns.some((pattern) =>
        extensions.some((ext) => ext.toLowerCase().startsWith(pattern.toLowerCase()))
      );
    } catch {
      return false;
    }
  }

  private isJetbrainsPluginDetected(name: string): boolean {
    const jetbrainsPath = path.join(
      this.homeDir,
      process.platform === 'win32' ? 'AppData' : '.config',
      'JetBrains'
    );

    if (!fs.existsSync(jetbrainsPath)) {
      return false;
    }

    try {
      const ideDirs = fs.readdirSync(jetbrainsPath);
      for (const ideDir of ideDirs) {
        const pluginsDir = path.join(jetbrainsPath, ideDir, 'plugins');
        if (fs.existsSync(pluginsDir)) {
          const plugins = fs.readdirSync(pluginsDir);
          if (name === 'jetbrains-ai') {
            return plugins.some((p) => p.toLowerCase().includes('ai') || p.toLowerCase().includes('jetbrains'));
          }
        }
      }
    } catch {
      return false;
    }
    return false;
  }

  getToolSkillPath(toolId: string): string | null {
    const def = TOOL_DEFINITIONS.find((d) => d.id === toolId);
    if (!def) return null;
    return path.join(this.homeDir, def.skillPath);
  }

  ensureToolSkillPath(toolId: string): string | null {
    const skillPath = this.getToolSkillPath(toolId);
    if (!skillPath) return null;

    if (!fs.existsSync(skillPath)) {
      fs.mkdirSync(skillPath, { recursive: true });
    }
    return skillPath;
  }
}

export const toolDetector = new ToolDetector();
