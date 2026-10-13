import { Request, Response, NextFunction } from 'express';
import { BrandsService } from './brands.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export class BrandsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await BrandsService.list({ search: req.query.search as string });
      return ApiResponse.success(res, brands);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const brand = await BrandsService.create({
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.created(res, brand, 'Brand created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const brand = await BrandsService.update(req.params.id, {
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.success(res, brand, 'Brand updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await BrandsService.delete(req.params.id, req.user?.id);
      return ApiResponse.success(res, result, 'Brand deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
}
