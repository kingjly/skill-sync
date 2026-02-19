import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('SkillRepo', () => {
  const testRepoPath = path.join(os.tmpdir(), `skill-sync-repo-test-${Date.now()}`);

  beforeEach(async () => {
    vi.resetModules();
    
    if (!fs.existsSync(testRepoPath)) {
      fs.mkdirSync(testRepoPath, { recursive: true });
    }

    process.env.SKILL_SYNC_REPO_PATH = testRepoPath;
  });

  afterEach(() => {
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
    delete process.env.SKILL_SYNC_REPO_PATH;
    vi.restoreAllMocks();
  });

  describe('Feature: Skill Repository Management', () => {
    describe('Scenario: List skills in empty repository', () => {
      it('Given an empty repository, When listing skills, Then empty array should be returned', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        const skills = skillRepo.list();
        expect(skills).toEqual([]);
      });
    });

    describe('Scenario: Create a new skill', () => {
      it('Given a skill name, When creating skill, Then skill should be created with SKILL.md', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        const skill = skillRepo.create('test-skill', 'A test skill for BDD');

        expect(skill).toBeDefined();
        expect(skill.name).toBe('test-skill');
        expect(skill.description).toContain('test-skill');
        expect(skill.files.length).toBeGreaterThan(0);

        const skillMdPath = path.join(testRepoPath, 'test-skill', 'SKILL.md');
        expect(fs.existsSync(skillMdPath)).toBe(true);
      });

      it('Given a skill already exists, When creating same skill, Then error should be thrown', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        skillRepo.create('duplicate-skill', 'First');
        
        expect(() => {
          skillRepo.create('duplicate-skill', 'Second');
        }).toThrow('already exists');
      });
    });

    describe('Scenario: Get skill by ID', () => {
      it('Given a skill exists, When getting by ID, Then skill should be returned', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        skillRepo.create('get-test-skill', 'Test description');
        const skill = skillRepo.get('get-test-skill');

        expect(skill).toBeDefined();
        expect(skill?.name).toBe('get-test-skill');
      });

      it('Given skill does not exist, When getting by ID, Then null should be returned', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        const skill = skillRepo.get('non-existent-skill');
        expect(skill).toBeNull();
      });
    });

    describe('Scenario: Delete a skill', () => {
      it('Given a skill exists, When deleting, Then skill should be removed', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        skillRepo.create('delete-test-skill', 'To be deleted');
        const deleted = skillRepo.delete('delete-test-skill');

        expect(deleted).toBe(true);
        expect(skillRepo.get('delete-test-skill')).toBeNull();
      });

      it('Given skill does not exist, When deleting, Then false should be returned', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        const deleted = skillRepo.delete('non-existent-skill');
        expect(deleted).toBe(false);
      });
    });

    describe('Scenario: File operations', () => {
      it('Given a skill with files, When getting file content, Then content should be returned', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        skillRepo.create('file-test-skill', 'Test');
        const content = skillRepo.getFileContent('file-test-skill', 'SKILL.md');

        expect(content).toBeDefined();
        expect(content).toContain('file-test-skill');
      });

      it('Given a skill, When updating file content, Then file should be updated', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        skillRepo.create('update-file-skill', 'Test');
        const newContent = '# Updated Content\n\nThis is updated.';
        
        const updated = skillRepo.updateFile('update-file-skill', 'SKILL.md', newContent);
        expect(updated).toBe(true);

        const content = skillRepo.getFileContent('update-file-skill', 'SKILL.md');
        expect(content).toContain('Updated Content');
      });

      it('Given a skill, When creating new file, Then file should be created', async () => {
        const { skillRepo } = await import('./skill-repo.js');
        
        skillRepo.create('new-file-skill', 'Test');
        const newContent = '## Reference\n\nSome reference content.';
        
        const created = skillRepo.updateFile('new-file-skill', 'REFERENCE.md', newContent);
        expect(created).toBe(true);

        const content = skillRepo.getFileContent('new-file-skill', 'REFERENCE.md');
        expect(content).toContain('Reference');
      });
    });
  });
});
