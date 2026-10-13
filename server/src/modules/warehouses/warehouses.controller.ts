import { Request, Response, NextFunction } from 'express';
import { WarehousesService } from './warehouses.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export class WarehousesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouses = await WarehousesService.list();
      return ApiResponse.success(res, warehouses);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouse = await WarehousesService.getById(req.params.id);
      return ApiResponse.success(res, warehouse);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouse = await WarehousesService.create({
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.created(res, warehouse, 'Warehouse created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouse = await WarehousesService.update(req.params.id, {
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.success(res, warehouse, 'Warehouse updated successfully');
    } catch (error) {
      return next(error);
    }
  }
}
