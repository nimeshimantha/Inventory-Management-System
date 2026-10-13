import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/index.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async login(email: string, password: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      await AuditService.log({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        details: { email, reason: 'Invalid credentials or inactive user' },
        ipAddress: meta?.ipAddress,
      });
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await argon2.verify(user.passwordHash, password);
    if (!isMatch) {
      await AuditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        details: { email, reason: 'Incorrect password' },
        ipAddress: meta?.ipAddress,
      });
      throw AppError.unauthorized('Invalid email or password');
    }

    // Generate JWT access token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.accessSecret,
      { expiresIn: '15m' }
    );

    // Generate Refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await AuditService.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      ipAddress: meta?.ipAddress,
    });

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        roles,
        permissions: Array.from(permissionSet),
      },
    };
  }

  static async refreshTokens(rawRefreshToken: string, meta?: { userAgent?: string; ipAddress?: string }) {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      if (session) {
        // Suspicious reuse of expired/revoked token - invalidate all sessions for safety
        await prisma.refreshSession.updateMany({
          where: { userId: session.userId },
          data: { isRevoked: true },
        });
      }
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    // Revoke current session (Rotation)
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Issue new pair
    const newAccessToken = jwt.sign(
      { userId: session.user.id, email: session.user.email },
      config.jwt.accessSecret,
      { expiresIn: '15m' }
    );

    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshSession.create({
      data: {
        userId: session.user.id,
        tokenHash: newTokenHash,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        expiresAt,
      },
    });

    const roles = session.user.userRoles.map((ur) => ur.role.code);
    const permissionSet = new Set<string>();
    for (const ur of session.user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        roles,
        permissions: Array.from(permissionSet),
      },
    };
  }

  static async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await prisma.refreshSession.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    }
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');

    const isMatch = await argon2.verify(user.passwordHash, currentPass);
    if (!isMatch) throw AppError.badRequest('Current password does not match');

    const newHash = await argon2.hash(newPass);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh sessions
    await prisma.refreshSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    await AuditService.log({
      userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
    });
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw AppError.notFound('User not found');

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      roles,
      permissions: Array.from(permissionSet),
    };
  }
}
