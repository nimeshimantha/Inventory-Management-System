import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/metrics', DashboardController.getMetrics);
router.get('/revenue-trends', DashboardController.getRevenueTrends);
router.get('/top-products', DashboardController.getTopProducts);
router.get('/recent-activity', DashboardController.getRecentActivity);
router.get('/low-stock', DashboardController.getLowStockAlerts);

export const dashboardRouter = router;
