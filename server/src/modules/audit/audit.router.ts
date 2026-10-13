import { Router, Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuditService.getLogs({
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      entityType: req.query.entityType as string,
      action: req.query.action as string,
      userId: req.query.userId as string,
    });

    return ApiResponse.success(res, result.logs, 'Audit logs retrieved', 200, result.pagination);
  } catch (error) {
    return next(error);
  }
});

export const auditRouter = router;
