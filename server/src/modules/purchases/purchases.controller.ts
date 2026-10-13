import { Request, Response, NextFunction } from 'express';
import { PurchasesService } from './purchases.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { PurchaseOrderStatus } from '@prisma/client';

export class PurchasesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PurchasesService.list({
        status: req.query.status as PurchaseOrderStatus,
        supplierId: req.query.supplierId as string,
        warehouseId: req.query.warehouseId as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      return ApiResponse.success(res, result.orders, 'Purchase orders retrieved', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await PurchasesService.getById(req.params.id);
      return ApiResponse.success(res, order);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await PurchasesService.create({
        ...req.body,
        userId: req.user?.id,
      });

      return ApiResponse.created(res, order, 'Purchase order draft created');
    } catch (error) {
      return next(error);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await PurchasesService.approve(req.params.id, req.user?.id);
      return ApiResponse.success(res, order, 'Purchase order approved');
    } catch (error) {
      return next(error);
    }
  }

  static async receiveGoods(req: Request, res: Response, next: NextFunction) {
    try {
      const receipt = await PurchasesService.receiveGoods(req.params.id, {
        ...req.body,
        userId: req.user?.id,
      });

      return ApiResponse.created(res, receipt, 'Goods received and stock balances incremented successfully');
    } catch (error) {
      return next(error);
    }
  }
}
