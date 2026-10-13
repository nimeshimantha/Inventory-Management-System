import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), UsersController.list);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), UsersController.create);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), UsersController.update);
router.patch('/:id/toggle-status', authorizeRole(['SUPER_ADMIN', 'ADMIN']), UsersController.toggleActive);

export const usersRouter = router;
