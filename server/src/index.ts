import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes/index.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

async function start(): Promise<void> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await registerRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    app.log.error({ error, request }, 'Unhandled error');
    void reply.status(500).send({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Skill Sync Server running at http://${HOST}:${PORT}`);
    console.log(`📚 API Documentation: http://${HOST}:${PORT}/api/health`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    try {
      await app.close();
      console.log('Server closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
