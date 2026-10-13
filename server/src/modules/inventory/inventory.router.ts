import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/balances', InventoryController.getBalances);
router.get('/movements', InventoryController.getMovements);
router.post('/adjustments', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), InventoryController.createAdjustment);

router.get('/transfers', InventoryController.listTransfers);
router.post('/transfers', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), InventoryController.createTransfer);
router.post('/transfers/:id/dispatch', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), InventoryController.dispatchTransfer);
router.post('/transfers/:id/receive', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), InventoryController.receiveTransfer);

export const inventoryRouter = router;
