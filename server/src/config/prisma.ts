import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Query performance monitoring in development
if (process.env.NODE_ENV !== 'production') {
  // @ts-expect-error Prisma event typing
  prisma.$on('query', (e: { query: string; params: string; duration: number }) => {
    if (e.duration > 100) {
      logger.warn(`Slow Query (${e.duration}ms): ${e.query}`);
    }
  });

  // @ts-expect-error Prisma event typing
  prisma.$on('error', (e: { message: string }) => {
    logger.error(`Prisma Error: ${e.message}`);
  });
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
