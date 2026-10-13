import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { StockMovementType, StockTransferStatus } from '@prisma/client';

export class InventoryController {
  static async getBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.getBalances({
        warehouseId: req.query.warehouseId as string,
        search: req.query.search as string,
        lowStock: req.query.lowStock === 'true',
        outOfStock: req.query.outOfStock === 'true',
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      return ApiResponse.success(res, result.balances, 'Stock balances retrieved', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.getMovements({
        warehouseId: req.query.warehouseId as string,
        productId: req.query.productId as string,
        type: req.query.type as StockMovementType,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      return ApiResponse.success(res, result.movements, 'Stock movements retrieved', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async createAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const adjustment = await InventoryService.createAdjustment({
        ...req.body,
        userId: req.user?.id,
      });

      return ApiResponse.created(res, adjustment, 'Stock adjustment applied successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async listTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.listTransfers({
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        status: req.query.status as StockTransferStatus,
      });

      return ApiResponse.success(res, result.transfers, 'Transfers retrieved', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await InventoryService.createTransfer({
        ...req.body,
        userId: req.user?.id,
      });

      return ApiResponse.created(res, transfer, 'Stock transfer draft created');
    } catch (error) {
      return next(error);
    }
  }

  static async dispatchTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await InventoryService.dispatchTransfer(req.params.id, req.user?.id);
      return ApiResponse.success(res, transfer, 'Stock transfer dispatched and source inventory deducted');
    } catch (error) {
      return next(error);
    }
  }

  static async receiveTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await InventoryService.receiveTransfer(req.params.id, req.user?.id);
      return ApiResponse.success(res, transfer, 'Stock transfer received and destination inventory updated');
    } catch (error) {
      return next(error);
    }
  }
}
