import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('ConfigService', () => {
  const testConfigDir = path.join(os.tmpdir(), `skill-sync-test-${Date.now()}`);

  beforeEach(() => {
    vi.resetModules();
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    process.env.SKILL_SYNC_CONFIG_DIR = testConfigDir;
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    delete process.env.SKILL_SYNC_CONFIG_DIR;
    vi.restoreAllMocks();
  });

  describe('Feature: Configuration Management', () => {
    describe('Scenario: Load default configuration', () => {
      it('Given no config file exists, When loading config, Then default values should be used', async () => {
        const { ConfigService } = await import('./config.js');
        const service = new ConfigService();
        const config = service.getConfig();

        expect(config).toBeDefined();
        expect(config.autoSync).toBe(false);
        expect(config.syncInterval).toBe(30000);
        expect(config.theme).toBe('system');
      });
    });

    describe('Scenario: Update configuration', () => {
      it('Given a config service, When updating config, Then changes should persist', async () => {
        const { ConfigService } = await import('./config.js');
        const service = new ConfigService();

        const updated = service.updateConfig({
          autoSync: true,
          syncInterval: 60000,
          theme: 'dark',
        });

        expect(updated.autoSync).toBe(true);
        expect(updated.syncInterval).toBe(60000);
        expect(updated.theme).toBe('dark');

        const reloaded = service.getConfig();
        expect(reloaded.autoSync).toBe(true);
        expect(reloaded.syncInterval).toBe(60000);
      });
    });

    describe('Scenario: Skill repository path', () => {
      it('Given no custom path set, When getting skill repo path, Then default path should be returned', async () => {
        const { ConfigService } = await import('./config.js');
        const service = new ConfigService();
        const skillPath = service.getSkillRepoPath();

        expect(skillPath).toContain('.skill-sync');
        expect(skillPath).toContain('skills');
      });

      it('Given a custom path, When setting skill repo path, Then path should be updated', async () => {
        const { ConfigService } = await import('./config.js');
        const service = new ConfigService();
        const customPath = path.join(os.tmpdir(), 'custom-skills');

        service.setSkillRepoPath(customPath);
        expect(service.getSkillRepoPath()).toBe(customPath);
      });
    });

    describe('Scenario: Ensure skill repository exists', () => {
      it('Given skill repo does not exist, When ensuring repo exists, Then directory should be created', async () => {
        const { ConfigService } = await import('./config.js');
        const service = new ConfigService();
        const testPath = path.join(testConfigDir, 'test-skills');

        service.setSkillRepoPath(testPath);
        const result = service.ensureSkillRepoExists();

        expect(result).toBe(testPath);
        expect(fs.existsSync(testPath)).toBe(true);
      });
    });
  });
});
