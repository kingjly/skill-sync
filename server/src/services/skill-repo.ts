import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Skill, SkillFile } from '../types/index.js';
import { configService } from './config.js';

export class SkillRepo {
  private getSkillRepoPath(): string {
    return configService.ensureSkillRepoExists();
  }

  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  list(): Skill[] {
    const repoPath = this.getSkillRepoPath();
    const skills: Skill[] = [];

    try {
      const entries = fs.readdirSync(repoPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skill = this.loadSkill(path.join(repoPath, entry.name));
          if (skill) {
            skills.push(skill);
          }
        }
      }
    } catch (error) {
      console.error('Failed to list skills:', error);
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  get(skillId: string): Skill | null {
    const repoPath = this.getSkillRepoPath();
    const skillPath = path.join(repoPath, skillId);
    return this.loadSkill(skillPath);
  }

  private loadSkill(skillPath: string): Skill | null {
    try {
      if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isDirectory()) {
        return null;
      }

      const skillId = path.basename(skillPath);
      const files = this.loadSkillFiles(skillPath);

      const metaPath = path.join(skillPath, 'SKILL.md');
      let description = '';
      let category = 'general';
      const tags: string[] = [];
      let sourceTool: string | undefined;
      let createdAt = '';
      let updatedAt = '';
      let version = 1;

      if (fs.existsSync(metaPath)) {
        const content = fs.readFileSync(metaPath, 'utf-8');
        const descMatch = content.match(/(?:^|\n)#\s+(.+?)(?:\n|$)/);
        if (descMatch?.[1]) {
          description = descMatch[1].trim();
        }
        const categoryMatch = content.match(/(?:^|\n)Category:\s*(.+?)(?:\n|$)/i);
        if (categoryMatch?.[1]) {
          category = categoryMatch[1].trim();
        }
        const tagsMatch = content.match(/(?:^|\n)Tags:\s*(.+?)(?:\n|$)/i);
        if (tagsMatch?.[1]) {
          tags.push(...tagsMatch[1].split(',').map((t) => t.trim()).filter(Boolean));
        }
        const sourceMatch = content.match(/(?:^|\n)Source:\s*(.+?)(?:\n|$)/i);
        if (sourceMatch?.[1]) {
          sourceTool = sourceMatch[1].trim();
        }
      }

      const stat = fs.statSync(skillPath);
      createdAt = stat.birthtime.toISOString();
      updatedAt = stat.mtime.toISOString();

      return {
        id: skillId,
        name: skillId,
        description,
        category,
        tags,
        files,
        createdAt,
        updatedAt,
        version,
        sourceTool,
      };
    } catch (error) {
      console.error(`Failed to load skill ${skillPath}:`, error);
      return null;
    }
  }

  private loadSkillFiles(skillPath: string): SkillFile[] {
    const files: SkillFile[] = [];

    const scanDir = (dir: string, basePath: string = '') => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

          if (entry.isDirectory()) {
            scanDir(fullPath, relativePath);
          } else if (entry.isFile()) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const stat = fs.statSync(fullPath);
            files.push({
              name: entry.name,
              path: relativePath,
              size: stat.size,
              hash: this.computeHash(content),
            });
          }
        }
      } catch (error) {
        console.error(`Failed to scan directory ${dir}:`, error);
      }
    };

    scanDir(skillPath);
    return files;
  }

  create(name: string, description?: string, sourceTool?: string): Skill {
    const repoPath = this.getSkillRepoPath();
    const skillPath = path.join(repoPath, name);

    if (fs.existsSync(skillPath)) {
      throw new Error(`Skill "${name}" already exists`);
    }

    fs.mkdirSync(skillPath, { recursive: true });

    const skillMd = `# ${name}

${description || 'A new skill for AI coding assistants.'}

Category: general
Tags: 
${sourceTool ? `Source: ${sourceTool}` : ''}
`;

    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), skillMd, 'utf-8');

    return this.get(name)!;
  }

  delete(skillId: string): boolean {
    const repoPath = this.getSkillRepoPath();
    const skillPath = path.join(repoPath, skillId);

    if (!fs.existsSync(skillPath)) {
      return false;
    }

    fs.rmSync(skillPath, { recursive: true, force: true });
    return true;
  }

  getFileContent(skillId: string, filePath: string): string | null {
    const repoPath = this.getSkillRepoPath();
    const fullPath = path.join(repoPath, skillId, filePath);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return fs.readFileSync(fullPath, 'utf-8');
  }

  updateFile(skillId: string, filePath: string, content: string): boolean {
    const repoPath = this.getSkillRepoPath();
    const fullPath = path.join(repoPath, skillId, filePath);

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    return true;
  }

  deleteFile(skillId: string, filePath: string): boolean {
    const repoPath = this.getSkillRepoPath();
    const fullPath = path.join(repoPath, skillId, filePath);

    if (!fs.existsSync(fullPath)) {
      return false;
    }

    fs.unlinkSync(fullPath);
    return true;
  }
}

export const skillRepo = new SkillRepo();
