import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export class UsersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UsersService.listUsers({
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string,
        role: req.query.role as string,
      });

      return ApiResponse.success(res, result.users, 'Users retrieved successfully', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.createUser({
        ...req.body,
        actorId: req.user?.id,
      });

      return ApiResponse.created(res, user, 'User created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.updateUser(req.params.id, {
        ...req.body,
        actorId: req.user?.id,
      });

      return ApiResponse.success(res, user, 'User updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.toggleActive(req.params.id, req.user?.id);
      return ApiResponse.success(res, user, 'User status changed successfully');
    } catch (error) {
      return next(error);
    }
  }
}
