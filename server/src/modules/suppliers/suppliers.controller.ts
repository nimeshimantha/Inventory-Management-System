import { Request, Response, NextFunction } from 'express';
import { SuppliersService } from './suppliers.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export class SuppliersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SuppliersService.list({
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      return ApiResponse.success(res, result.suppliers, 'Suppliers retrieved', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SuppliersService.getById(req.params.id);
      return ApiResponse.success(res, supplier);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SuppliersService.create({
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.created(res, supplier, 'Supplier registered successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SuppliersService.update(req.params.id, {
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.success(res, supplier, 'Supplier updated successfully');
    } catch (error) {
      return next(error);
    }
  }
}
