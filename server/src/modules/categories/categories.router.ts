import { Router } from 'express';
import { CategoriesController } from './categories.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', CategoriesController.list);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), CategoriesController.create);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), CategoriesController.update);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), CategoriesController.delete);

export const categoriesRouter = router;
