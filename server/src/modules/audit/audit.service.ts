import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export class AuditService {
  static async log(params: CreateAuditLogParams) {
    try {
      // Sanitize details to guarantee no passwords, secrets, or tokens are logged
      const sanitizedDetails = params.details ? { ...params.details } : {};
      const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'jwt'];
      for (const key of Object.keys(sanitizedDetails)) {
        if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
          delete sanitizedDetails[key];
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          details: Object.keys(sanitizedDetails).length > 0 ? JSON.stringify(sanitizedDetails) : null,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to write audit log entry');
    }
  }

  static async getLogs(query: {
    page?: number;
    limit?: number;
    entityType?: string;
    action?: string;
    userId?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
