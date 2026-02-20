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

export interface ImportedSkill {
  name: string;
  toolId: string;
  toolName: string;
  skillPath: string;
  fileCount: number;
  size: number;
  description?: string;
  isSymlink?: boolean;
}

export interface SkillFilePreview {
  path: string;
  content: string;
  size: number;
}

class SyncService {
  listToolsSkills(): ImportedSkill[] {
    const tools = toolDetector.detectAll();
    const installedTools = tools.filter((t) => t.installed);
    const importedSkills: ImportedSkill[] = [];

    for (const tool of installedTools) {
      const toolSkillPath = toolDetector.getToolSkillPath(tool.id);
      if (!toolSkillPath || !fs.existsSync(toolSkillPath)) {
        continue;
      }

      try {
        const entries = fs.readdirSync(toolSkillPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

          const skillDir = path.join(toolSkillPath, entry.name);
          let isSymlink = false;
          let actualPath = skillDir;
          
          try {
            const stat = fs.lstatSync(skillDir);
            isSymlink = stat.isSymbolicLink();
            if (isSymlink) {
              actualPath = fs.readlinkSync(skillDir);
            }
          } catch {
            continue;
          }

          const stats = this.getDirStats(actualPath);
          const description = this.getSkillDescription(actualPath);

          importedSkills.push({
            name: entry.name,
            toolId: tool.id,
            toolName: tool.displayName,
            skillPath: skillDir,
            fileCount: stats.fileCount,
            size: stats.size,
            description,
            isSymlink,
          });
        }
      } catch (error) {
        console.error(`Failed to scan tool ${tool.id}:`, error);
      }
    }

    return importedSkills;
  }

  previewSkillFiles(toolId: string, skillName: string): SkillFilePreview[] {
    const toolSkillPath = toolDetector.getToolSkillPath(toolId);
    if (!toolSkillPath) {
      return [];
    }

    const skillPath = path.join(toolSkillPath, skillName);
    let actualPath = skillPath;
    
    try {
      const stat = fs.lstatSync(skillPath);
      if (stat.isSymbolicLink()) {
        actualPath = fs.readlinkSync(skillPath);
      }
    } catch {
      return [];
    }

    if (!fs.existsSync(actualPath)) {
      return [];
    }

    const files: SkillFilePreview[] = [];
    const scanDir = (dir: string, basePath: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          scanDir(fullPath, relativePath);
        } else if (entry.isFile()) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const stat = fs.statSync(fullPath);
            files.push({
              path: relativePath,
              content,
              size: stat.size,
            });
          } catch {
            // skip files that can't be read
          }
        }
      }
    };

    try {
      scanDir(actualPath);
    } catch {
      return [];
    }

    return files;
  }

  private getDirStats(dir: string): { fileCount: number; size: number } {
    let fileCount = 0;
    let size = 0;

    const scan = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile()) {
          fileCount++;
          size += fs.statSync(fullPath).size;
        }
      }
    };

    try {
      scan(dir);
    } catch {
      // ignore errors
    }

    return { fileCount, size };
  }

  private getSkillDescription(skillDir: string): string | undefined {
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) return undefined;

    try {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const match = content.match(/(?:^|\n)#\s+(.+?)(?:\n|$)/);
      return match?.[1]?.trim();
    } catch {
      return undefined;
    }
  }

  importFromTool(toolId: string, skillName: string, overwrite: boolean = false, useSymlink: boolean = false): { success: boolean; error?: string; imported?: boolean } {
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
        const stat = fs.lstatSync(targetPath);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(targetPath);
        } else {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
      }

      let actualSourcePath = sourcePath;
      try {
        const sourceStat = fs.lstatSync(sourcePath);
        if (sourceStat.isSymbolicLink()) {
          actualSourcePath = fs.readlinkSync(sourcePath);
        }
      } catch {
        // use sourcePath as is
      }

      this.copyDir(actualSourcePath, targetPath);

      if (useSymlink && this.canUseSymlink()) {
        const backupPath = sourcePath + '.backup';
        if (fs.existsSync(sourcePath)) {
          const stat = fs.lstatSync(sourcePath);
          if (!stat.isSymbolicLink()) {
            fs.renameSync(sourcePath, backupPath);
            try {
              fs.symlinkSync(targetPath, sourcePath, 'junction');
              fs.rmSync(backupPath, { recursive: true, force: true });
            } catch (symlinkError) {
              fs.renameSync(backupPath, sourcePath);
              throw symlinkError;
            }
          } else {
            fs.unlinkSync(sourcePath);
            fs.symlinkSync(targetPath, sourcePath, 'junction');
          }
        } else {
          fs.symlinkSync(targetPath, sourcePath, 'junction');
        }
      }

      return { success: true, imported: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  restoreFromSymlink(toolId: string, skillName: string): { success: boolean; error?: string } {
    const toolSkillPath = toolDetector.getToolSkillPath(toolId);
    if (!toolSkillPath) {
      return { success: false, error: `Tool "${toolId}" not supported` };
    }

    const skillPath = path.join(toolSkillPath, skillName);
    
    try {
      const stat = fs.lstatSync(skillPath);
      if (!stat.isSymbolicLink()) {
        return { success: false, error: `"${skillName}" is not a symlink` };
      }

      let targetPath = fs.readlinkSync(skillPath);
      if (!fs.existsSync(targetPath)) {
        targetPath = path.resolve(path.dirname(skillPath), targetPath);
      }
      if (!fs.existsSync(targetPath)) {
        return { success: false, error: `Symlink target does not exist: ${targetPath}` };
      }

      const targetStats = fs.statSync(targetPath);
      if (!targetStats.isDirectory()) {
        return { success: false, error: `Symlink target is not a directory` };
      }

      fs.unlinkSync(skillPath);
      
      this.copyDir(targetPath, skillPath);

      const verifyStat = fs.lstatSync(skillPath);
      if (verifyStat.isSymbolicLink()) {
        return { success: false, error: 'Restore failed: path is still a symlink' };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  importAllFromTool(toolId: string, overwrite: boolean = false): { success: boolean; error?: string; imported: number; failed: number } {
    const toolSkillPath = toolDetector.getToolSkillPath(toolId);
    if (!toolSkillPath || !fs.existsSync(toolSkillPath)) {
      return { success: false, error: `Tool "${toolId}" not found or skills directory doesn't exist`, imported: 0, failed: 0 };
    }

    let imported = 0;
    let failed = 0;

    try {
      const entries = fs.readdirSync(toolSkillPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const result = this.importFromTool(toolId, entry.name, overwrite);
        if (result.success && result.imported) {
          imported++;
        } else {
          failed++;
        }
      }

      return { success: failed === 0, imported, failed };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message, imported, failed };
    }
  }

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
    return this.importFromTool(toolId, skillName, overwrite);
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
