import { Router } from 'express';
import { SuppliersController } from './suppliers.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', SuppliersController.list);
router.get('/:id', SuppliersController.getById);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), SuppliersController.create);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), SuppliersController.update);

export const suppliersRouter = router;
