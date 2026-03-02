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
    const resolvedSkillPath = this.getToolSkillPath(def.id);
    const detected = this.isToolDetected(def);
    const installed = resolvedSkillPath ? fs.existsSync(resolvedSkillPath) : false;

    return {
      ...def,
      skillPath: def.id === 'copilot' && resolvedSkillPath ? resolvedSkillPath : def.skillPath,
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
    const isWindows = process.platform === 'win32';

    for (const cmd of cmds) {
      try {
        execSync(`where ${cmd}`, { stdio: 'ignore', timeout: 5000 });
        return true;
      } catch {
        if (isWindows) {
          continue;
        }
        try {
          execSync(`which ${cmd}`, { stdio: 'ignore', timeout: 5000 });
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
    const extensionPatterns: Record<string, string[]> = {
      copilot: ['github.copilot', 'github.copilot-chat'],
      continue: ['continue.continue'],
      cline: ['saoudrizwan.claude-dev'],
      'roo-code': ['rooveterinaryinc.roo-cline'],
      'amazon-q': ['amazonwebservices.amazon-q-vscode'],
    };

    const patterns = extensionPatterns[name] || [];
    for (const extensionsPath of this.getVscodeExtensionRoots()) {
      if (!fs.existsSync(extensionsPath)) {
        continue;
      }
      try {
        const extensions = fs.readdirSync(extensionsPath);
        const found = patterns.some((pattern) =>
          extensions.some((ext) => ext.toLowerCase().startsWith(pattern.toLowerCase()))
        );
        if (found) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
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

  private getVscodeExtensionRoots(): string[] {
    return [
      path.join(this.homeDir, '.vscode', 'extensions'),
      path.join(this.homeDir, '.vscode-insiders', 'extensions'),
    ];
  }

  private resolveCopilotSkillPath(): string | null {
    const candidates: Array<{ path: string; mtimeMs: number }> = [];

    for (const extensionsPath of this.getVscodeExtensionRoots()) {
      if (!fs.existsSync(extensionsPath)) {
        continue;
      }

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(extensionsPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const extensionName = entry.name.toLowerCase();
        const isCopilotChat =
          extensionName === 'github.copilot-chat' ||
          extensionName.startsWith('github.copilot-chat-');
        if (!isCopilotChat) {
          continue;
        }

        const extensionDir = path.join(extensionsPath, entry.name);
        const skillsPath = path.join(extensionDir, 'assets', 'prompts', 'skills');
        if (!fs.existsSync(skillsPath)) {
          continue;
        }

        try {
          if (!fs.statSync(skillsPath).isDirectory()) {
            continue;
          }
          const extensionStat = fs.statSync(extensionDir);
          candidates.push({
            path: skillsPath,
            mtimeMs: extensionStat.mtimeMs,
          });
        } catch {
          continue;
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0]?.path ?? null;
  }

  getToolSkillPath(toolId: string): string | null {
    const def = TOOL_DEFINITIONS.find((d) => d.id === toolId);
    if (!def) return null;

    if (toolId === 'copilot') {
      return this.resolveCopilotSkillPath();
    }

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
