import type { FastifyInstance } from 'fastify';
import type { ApiResponse, Tool, Skill, SyncStatus, AppConfig } from '../types/index.js';
import { toolDetector } from '../services/detector.js';
import { skillRepo } from '../services/skill-repo.js';
import { configService } from '../services/config.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  });

  app.get('/api/tools', async (): Promise<ApiResponse<Tool[]>> => {
    try {
      const tools = toolDetector.detectAll();
      return { success: true, data: tools };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.get('/api/tools/:id', async (request): Promise<ApiResponse<Tool>> => {
    try {
      const { id } = request.params as { id: string };
      const tools = toolDetector.detectAll();
      const tool = tools.find((t) => t.id === id);

      if (!tool) {
        return { success: false, error: `Tool "${id}" not found` };
      }

      return { success: true, data: tool };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.get('/api/skills', async (): Promise<ApiResponse<Skill[]>> => {
    try {
      const skills = skillRepo.list();
      return { success: true, data: skills };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.get('/api/skills/:id', async (request): Promise<ApiResponse<Skill>> => {
    try {
      const { id } = request.params as { id: string };
      const skill = skillRepo.get(id);

      if (!skill) {
        return { success: false, error: `Skill "${id}" not found` };
      }

      return { success: true, data: skill };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.post('/api/skills', async (request): Promise<ApiResponse<Skill>> => {
    try {
      const { name, description, sourceTool } = request.body as {
        name: string;
        description?: string;
        sourceTool?: string;
      };

      if (!name || typeof name !== 'string') {
        return { success: false, error: 'Skill name is required' };
      }

      const skill = skillRepo.create(name, description, sourceTool);
      return { success: true, data: skill, message: `Skill "${name}" created` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.delete('/api/skills/:id', async (request): Promise<ApiResponse> => {
    try {
      const { id } = request.params as { id: string };
      const deleted = skillRepo.delete(id);

      if (!deleted) {
        return { success: false, error: `Skill "${id}" not found` };
      }

      return { success: true, message: `Skill "${id}" deleted` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.get('/api/skills/:id/files/:path', async (request): Promise<ApiResponse<string>> => {
    try {
      const { id, path: filePath } = request.params as { id: string; path: string };
      const content = skillRepo.getFileContent(id, decodeURIComponent(filePath));

      if (content === null) {
        return { success: false, error: `File not found` };
      }

      return { success: true, data: content };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.put('/api/skills/:id/files/:path', async (request): Promise<ApiResponse> => {
    try {
      const { id, path: filePath } = request.params as { id: string; path: string };
      const { content } = request.body as { content: string };

      const updated = skillRepo.updateFile(id, decodeURIComponent(filePath), content);

      if (!updated) {
        return { success: false, error: 'Failed to update file' };
      }

      return { success: true, message: 'File updated' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.get('/api/config', async (): Promise<ApiResponse<AppConfig>> => {
    try {
      const config = configService.getConfig();
      return { success: true, data: config };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.put('/api/config', async (request): Promise<ApiResponse<AppConfig>> => {
    try {
      const updates = request.body as Partial<AppConfig>;
      const config = configService.updateConfig(updates);
      return { success: true, data: config, message: 'Config updated' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  app.get('/api/sync/status', async (): Promise<ApiResponse<SyncStatus[]>> => {
    try {
      const status: SyncStatus[] = [];
      return { success: true, data: status };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
