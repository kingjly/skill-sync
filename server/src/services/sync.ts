import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type { SyncStatus } from '../types/index.js';
import { configService } from './config.js';
import { toolDetector } from './detector.js';
import { skillRepo } from './skill-repo.js';

export interface SyncResult {
  toolId: string;
  skillId: string;
  success: boolean;
  method: 'symlink' | 'copy';
  error?: string;
}

export interface MergePreview {
  skillName: string;
  sourceTool: string;
  targetPath: string;
  files: MergeFile[];
  conflicts: ConflictInfo[];
  hasConflicts: boolean;
}

export interface MergeFile {
  name: string;
  sourcePath: string;
  targetPath: string;
  action: 'create' | 'skip' | 'overwrite';
  exists: boolean;
  sourceHash: string;
  targetHash?: string;
}

export interface ConflictInfo {
  fileName: string;
  sourceHash: string;
  targetHash: string;
  autoResolvable: boolean;
}

class SyncService {
  syncSkillToTool(skillId: string, toolId: string): SyncResult {
    const skill = skillRepo.get(skillId);
    if (!skill) {
      return {
        toolId,
        skillId,
        success: false,
        method: 'copy',
        error: `Skill "${skillId}" not found`,
      };
    }

    const toolSkillPath = toolDetector.getToolSkillPath(toolId);
    if (!toolSkillPath) {
      return {
        toolId,
        skillId,
        success: false,
        method: 'copy',
        error: `Tool "${toolId}" not supported`,
      };
    }

    this.ensureDir(toolSkillPath);

    const targetPath = path.join(toolSkillPath, skillId);
    const sourcePath = path.join(configService.getSkillRepoPath(), skillId);

    const method = this.canUseSymlink() ? 'symlink' : 'copy';

    try {
      if (fs.existsSync(targetPath)) {
        const stat = fs.lstatSync(targetPath);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(targetPath);
        } else {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
      }

      if (method === 'symlink') {
        fs.symlinkSync(sourcePath, targetPath, 'junction');
      } else {
        this.copyDir(sourcePath, targetPath);
      }

      return { toolId, skillId, success: true, method };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { toolId, skillId, success: false, method, error: message };
    }
  }

  syncAllSkillsToTool(toolId: string): SyncResult[] {
    const skills = skillRepo.list();
    return skills.map((skill) => this.syncSkillToTool(skill.id, toolId));
  }

  syncSkillToAllTools(skillId: string): SyncResult[] {
    const tools = toolDetector.detectAll();
    const detectedTools = tools.filter((t) => t.detected);
    return detectedTools.map((tool) => this.syncSkillToTool(skillId, tool.id));
  }

  syncAll(): SyncResult[] {
    const skills = skillRepo.list();
    const tools = toolDetector.detectAll();
    const detectedTools = tools.filter((t) => t.detected);

    const results: SyncResult[] = [];
    for (const skill of skills) {
      for (const tool of detectedTools) {
        results.push(this.syncSkillToTool(skill.id, tool.id));
      }
    }
    return results;
  }

  getSyncStatus(toolId: string): SyncStatus[] {
    const skills = skillRepo.list();
    const toolSkillPath = toolDetector.getToolSkillPath(toolId);

    if (!toolSkillPath) return [];

    return skills.map((skill) => {
      const targetPath = path.join(toolSkillPath, skill.id);
      const exists = fs.existsSync(targetPath);

      if (!exists) {
        return {
          toolId,
          skillId: skill.id,
          syncedAt: '',
          status: 'pending' as const,
          method: 'copy' as const,
        };
      }

      try {
        const stat = fs.lstatSync(targetPath);
        const method = stat.isSymbolicLink() ? 'symlink' : 'copy';
        const mtime = stat.mtime.toISOString();

        return {
          toolId,
          skillId: skill.id,
          syncedAt: mtime,
          status: 'synced' as const,
          method: method as 'symlink' | 'copy',
        };
      } catch {
        return {
          toolId,
          skillId: skill.id,
          syncedAt: '',
          status: 'error' as const,
          method: 'copy' as const,
          error: 'Failed to check sync status',
        };
      }
    });
  }

  previewMerge(toolId: string): MergePreview[] {
    const toolSkillPath = toolDetector.getToolSkillPath(toolId);
    if (!toolSkillPath || !fs.existsSync(toolSkillPath)) {
      return [];
    }

    const previews: MergePreview[] = [];
    const entries = fs.readdirSync(toolSkillPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillName = entry.name;
      const sourcePath = path.join(toolSkillPath, skillName);
      const targetPath = path.join(configService.getSkillRepoPath(), skillName);

      const files = this.analyzeMergeFiles(sourcePath, targetPath);
      const conflicts = files.filter((f) => f.action === 'overwrite' && f.targetHash && f.sourceHash !== f.targetHash);

      previews.push({
        skillName,
        sourceTool: toolId,
        targetPath,
        files,
        conflicts: conflicts.map((f) => ({
          fileName: f.name,
          sourceHash: f.sourceHash,
          targetHash: f.targetHash!,
          autoResolvable: false,
        })),
        hasConflicts: conflicts.length > 0,
      });
    }

    return previews;
  }

  executeMerge(toolId: string, skillName: string, overwrite: boolean = false): { success: boolean; error?: string } {
    const toolSkillPath = toolDetector.getToolSkillPath(toolId);
    if (!toolSkillPath) {
      return { success: false, error: `Tool "${toolId}" not supported` };
    }

    const sourcePath = path.join(toolSkillPath, skillName);
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: `Skill "${skillName}" not found in tool directory` };
    }

    const targetPath = path.join(configService.getSkillRepoPath(), skillName);

    if (fs.existsSync(targetPath) && !overwrite) {
      return { success: false, error: `Skill "${skillName}" already exists. Use overwrite=true to replace.` };
    }

    try {
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }

      this.copyDir(sourcePath, targetPath);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  private analyzeMergeFiles(sourceDir: string, targetDir: string): MergeFile[] {
    const files: MergeFile[] = [];

    const scanDir = (dir: string, basePath: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          scanDir(fullPath, relativePath);
        } else if (entry.isFile()) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const sourceHash = this.computeHash(content);
          const targetFullPath = path.join(targetDir, relativePath);
          const exists = fs.existsSync(targetFullPath);

          let targetHash: string | undefined;
          if (exists) {
            const targetContent = fs.readFileSync(targetFullPath, 'utf-8');
            targetHash = this.computeHash(targetContent);
          }

          files.push({
            name: entry.name,
            sourcePath: fullPath,
            targetPath: targetFullPath,
            action: exists ? 'overwrite' : 'create',
            exists,
            sourceHash,
            targetHash,
          });
        }
      }
    };

    scanDir(sourceDir);
    return files;
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private canUseSymlink(): boolean {
    return process.platform !== 'win32' || this.canCreateSymlinksOnWindows();
  }

  private canCreateSymlinksOnWindows(): boolean {
    try {
      const testPath = path.join(os.tmpdir(), `symlink-test-${Date.now()}`);
      const testTarget = path.join(os.tmpdir(), `symlink-target-${Date.now()}`);
      fs.writeFileSync(testTarget, 'test');
      fs.symlinkSync(testTarget, testPath, 'junction');
      fs.unlinkSync(testPath);
      fs.unlinkSync(testTarget);
      return true;
    } catch {
      return false;
    }
  }

  private copyDir(src: string, dest: string): void {
    this.ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}

export const syncService = new SyncService();
