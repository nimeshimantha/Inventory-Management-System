import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/valuation', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']), ReportsController.getValuation);
router.get('/sales', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']), ReportsController.getSales);
router.get('/purchases', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']), ReportsController.getPurchases);
router.get('/profit-margin', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']), ReportsController.getProfitMargin);

export const reportsRouter = router;
