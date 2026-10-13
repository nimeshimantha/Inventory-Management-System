import { Router } from 'express';
import { WarehousesController } from './warehouses.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', WarehousesController.list);
router.get('/:id', WarehousesController.getById);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), WarehousesController.create);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), WarehousesController.update);

export const warehousesRouter = router;
