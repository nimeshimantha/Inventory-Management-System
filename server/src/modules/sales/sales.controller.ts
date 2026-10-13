import { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { SalesOrderStatus, PaymentStatus } from '@prisma/client';

export class SalesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SalesService.list({
        status: req.query.status as SalesOrderStatus,
        paymentStatus: req.query.paymentStatus as PaymentStatus,
        customerId: req.query.customerId as string,
        warehouseId: req.query.warehouseId as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      return ApiResponse.success(res, result.orders, 'Sales orders retrieved', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await SalesService.getById(req.params.id);
      return ApiResponse.success(res, order);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await SalesService.create({
        ...req.body,
        userId: req.user?.id,
      });

      return ApiResponse.created(res, order, 'Sales order and invoice created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async fulfill(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await SalesService.fulfillOrder(req.params.id, req.user?.id);
      return ApiResponse.success(res, order, 'Sales order fulfilled and inventory deducted');
    } catch (error) {
      return next(error);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await SalesService.recordPayment(req.params.id, {
        ...req.body,
        userId: req.user?.id,
      });

      return ApiResponse.created(res, payment, 'Payment recorded successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async processReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const salesReturn = await SalesService.processReturn(req.params.id, {
        ...req.body,
        userId: req.user?.id,
      });

      return ApiResponse.created(res, salesReturn, 'Sales return processed successfully');
    } catch (error) {
      return next(error);
    }
  }
}
