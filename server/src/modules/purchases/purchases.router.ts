import { Router } from 'express';
import { PurchasesController } from './purchases.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', PurchasesController.list);
router.get('/:id', PurchasesController.getById);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), PurchasesController.create);
router.post('/:id/approve', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), PurchasesController.approve);
router.post('/:id/receive', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), PurchasesController.receiveGoods);

export const purchasesRouter = router;
