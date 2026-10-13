import { Router } from 'express';
import { SalesController } from './sales.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', SalesController.list);
router.get('/:id', SalesController.getById);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), SalesController.create);
router.post('/:id/fulfill', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), SalesController.fulfill);
router.post('/:id/payments', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), SalesController.recordPayment);
router.post('/:id/returns', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), SalesController.processReturn);

export const salesRouter = router;
