import { Router } from 'express';
import { ProductsController, upload } from './products.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/export/csv', ProductsController.exportCsv);
router.get('/', ProductsController.list);
router.get('/:id', ProductsController.getById);
router.get('/:id/movements', ProductsController.getMovements);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), ProductsController.create);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), ProductsController.update);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), ProductsController.archive);
router.post('/:id/images', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), upload.single('image'), ProductsController.uploadImage);

export const productsRouter = router;
