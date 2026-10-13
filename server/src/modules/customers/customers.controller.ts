import { Request, Response, NextFunction } from 'express';
import { CustomersService } from './customers.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export class CustomersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomersService.list({
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      return ApiResponse.success(res, result.customers, 'Customers retrieved', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomersService.getById(req.params.id);
      return ApiResponse.success(res, customer);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomersService.create({
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.created(res, customer, 'Customer created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomersService.update(req.params.id, {
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.success(res, customer, 'Customer updated successfully');
    } catch (error) {
      return next(error);
    }
  }
}
