import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError.js';

export function authorizeRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    // Super Admin bypasses all role constraints
    if (req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return next(AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')}`));
    }

    return next();
  };
}

export function authorizePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    // Super Admin bypasses all permission constraints
    if (req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return next(AppError.forbidden(`Missing required permission: ${requiredPermission}`));
    }

    return next();
  };
}
