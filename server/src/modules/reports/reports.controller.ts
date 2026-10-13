import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export class ReportsController {
  static async getValuation(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await ReportsService.getValuationReport({
        warehouseId: req.query.warehouseId as string,
        categoryId: req.query.categoryId as string,
      });
      return ApiResponse.success(res, report);
    } catch (error) {
      return next(error);
    }
  }

  static async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await ReportsService.getSalesReport({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        customerId: req.query.customerId as string,
        warehouseId: req.query.warehouseId as string,
      });
      return ApiResponse.success(res, report);
    } catch (error) {
      return next(error);
    }
  }

  static async getPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await ReportsService.getPurchasesReport({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        supplierId: req.query.supplierId as string,
        warehouseId: req.query.warehouseId as string,
      });
      return ApiResponse.success(res, report);
    } catch (error) {
      return next(error);
    }
  }

  static async getProfitMargin(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await ReportsService.getProfitMarginReport({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      return ApiResponse.success(res, report);
    } catch (error) {
      return next(error);
    }
  }
}
