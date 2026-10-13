import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from './categories.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export class CategoriesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoriesService.list({
        search: req.query.search as string,
        parentOnly: req.query.parentOnly === 'true',
      });
      return ApiResponse.success(res, categories);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoriesService.create({
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.created(res, category, 'Category created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoriesService.update(req.params.id, {
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.success(res, category, 'Category updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CategoriesService.delete(req.params.id, req.user?.id);
      return ApiResponse.success(res, result, 'Category deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
}
