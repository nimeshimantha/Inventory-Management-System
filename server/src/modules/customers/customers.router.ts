import { Router } from 'express';
import { CustomersController } from './customers.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', CustomersController.list);
router.get('/:id', CustomersController.getById);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), CustomersController.create);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), CustomersController.update);

export const customersRouter = router;
