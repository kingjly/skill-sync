import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { registerRoutes } from '../src/routes/index.js';

describe('API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await registerRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Feature: Health Check API', () => {
    describe('Scenario: Check server health', () => {
      it('Given the server is running, When GET /api/health, Then status ok should be returned', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/health',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('ok');
        expect(body.timestamp).toBeDefined();
        expect(body.version).toBeDefined();
      });
    });
  });

  describe('Feature: Tools API', () => {
    describe('Scenario: List all tools', () => {
      it('Given the tools endpoint, When GET /api/tools, Then all supported tools should be returned', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/tools',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeInstanceOf(Array);
        expect(body.data.length).toBeGreaterThanOrEqual(10);

        const toolIds = body.data.map((t: { id: string }) => t.id);
        expect(toolIds).toContain('claude-code');
        expect(toolIds).toContain('cursor');
        expect(toolIds).toContain('windsurf');
        expect(toolIds).toContain('trae');
      });
    });

    describe('Scenario: Get specific tool', () => {
      it('Given a valid tool ID, When GET /api/tools/:id, Then tool details should be returned', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/tools/claude-code',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.id).toBe('claude-code');
        expect(body.data.displayName).toBe('Claude Code');
        expect(body.data.category).toBe('cli');
      });

      it('Given an invalid tool ID, When GET /api/tools/:id, Then 404 should be returned', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/tools/non-existent-tool',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
        expect(body.error).toContain('not found');
      });
    });
  });

  describe('Feature: Skills API', () => {
    describe('Scenario: List skills', () => {
      it('Given the skills endpoint, When GET /api/skills, Then skills array should be returned', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/skills',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeInstanceOf(Array);
      });
    });

    describe('Scenario: Create and delete skill', () => {
      it('Given a skill name, When POST /api/skills, Then skill should be created', async () => {
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/skills',
          payload: {
            name: `test-skill-${Date.now()}`,
            description: 'Test skill for integration tests',
          },
        });

        expect(createResponse.statusCode).toBe(200);
        const createBody = JSON.parse(createResponse.body);
        expect(createBody.success).toBe(true);
        expect(createBody.data.name).toContain('test-skill');

        const skillId = createBody.data.id;

        const deleteResponse = await app.inject({
          method: 'DELETE',
          url: `/api/skills/${skillId}`,
        });

        expect(deleteResponse.statusCode).toBe(200);
        const deleteBody = JSON.parse(deleteResponse.body);
        expect(deleteBody.success).toBe(true);
      });

      it('Given empty skill name, When POST /api/skills, Then error should be returned', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/skills',
          payload: { name: '' },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
        expect(body.error).toContain('required');
      });
    });
  });

  describe('Feature: Config API', () => {
    describe('Scenario: Get configuration', () => {
      it('Given the config endpoint, When GET /api/config, Then config should be returned', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/config',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
      });
    });

    describe('Scenario: Update configuration', () => {
      it('Given config updates, When PUT /api/config, Then config should be updated', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/api/config',
          payload: {
            autoSync: true,
            theme: 'dark',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.autoSync).toBe(true);
        expect(body.data.theme).toBe('dark');
      });
    });
  });

  describe('Feature: Sync API', () => {
    describe('Scenario: Get sync status', () => {
      it('Given the sync status endpoint, When GET /api/sync/status, Then status array should be returned', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/sync/status',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeInstanceOf(Array);
      });
    });
  });
});
