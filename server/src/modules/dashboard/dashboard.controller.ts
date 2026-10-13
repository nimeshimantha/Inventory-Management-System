import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export class DashboardController {
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await DashboardService.getMetrics();
      return ApiResponse.success(res, metrics);
    } catch (error) {
      return next(error);
    }
  }

  static async getRevenueTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const trends = await DashboardService.getRevenueTrends(days);
      return ApiResponse.success(res, trends);
    } catch (error) {
      return next(error);
    }
  }

  static async getTopProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const topProducts = await DashboardService.getTopProducts(limit);
      return ApiResponse.success(res, topProducts);
    } catch (error) {
      return next(error);
    }
  }

  static async getRecentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const activity = await DashboardService.getRecentActivity();
      return ApiResponse.success(res, activity);
    } catch (error) {
      return next(error);
    }
  }

  static async getLowStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await DashboardService.getLowStockAlerts();
      return ApiResponse.success(res, alerts);
    } catch (error) {
      return next(error);
    }
  }
}
