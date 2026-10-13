import { Router } from 'express';
import { BrandsController } from './brands.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', BrandsController.list);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), BrandsController.create);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), BrandsController.update);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), BrandsController.delete);

export const brandsRouter = router;
