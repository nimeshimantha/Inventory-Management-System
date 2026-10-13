import argon2 from 'argon2';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';

export class UsersService {
  static async listUsers(query: { page?: number; limit?: number; search?: string; role?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) {
      where.userRoles = {
        some: {
          role: { code: query.role },
        },
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
    ]);

    const formatted = users.map((u) => ({
      ...u,
      roles: u.userRoles.map((ur) => ur.role),
    }));

    return {
      users: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleCodes: string[];
    actorId?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      throw AppError.conflict('A user with this email address already exists');
    }

    const passwordHash = await argon2.hash(data.password);
    const roles = await prisma.role.findMany({
      where: { code: { in: data.roleCodes } },
    });

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        userRoles: {
          create: roles.map((r) => ({ roleId: r.id })),
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      details: { email: user.email, roles: data.roleCodes },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isActive: user.isActive,
      roles: user.userRoles.map((ur) => ur.role),
    };
  }

  static async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      roleCodes?: string[];
      isActive?: boolean;
      actorId?: string;
    }
  ) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('User not found');

    if (data.roleCodes) {
      const roles = await prisma.role.findMany({
        where: { code: { in: data.roleCodes } },
      });

      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.createMany({
        data: roles.map((r) => ({ userId: id, roleId: r.id })),
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        isActive: data.isActive,
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      details: { firstName: data.firstName, lastName: data.lastName, isActive: data.isActive },
    });

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      isActive: updated.isActive,
      roles: updated.userRoles.map((ur) => ur.role),
    };
  }

  static async toggleActive(id: string, actorId?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    await AuditService.log({
      userId: actorId,
      action: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: id,
    });

    return updated;
  }
}
