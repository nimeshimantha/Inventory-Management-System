import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const server = app.listen(config.port, () => {
  logger.info(`🚀 StockFlow API Server running at http://localhost:${config.port}`);
  logger.info(`📖 Swagger API Docs available at http://localhost:${config.port}/api-docs`);
  logger.info(`🏥 Health check at http://localhost:${config.port}/health`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
