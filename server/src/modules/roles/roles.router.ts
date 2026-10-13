import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = roles.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.rolePermissions.map((rp) => rp.permission),
    }));

    return ApiResponse.success(res, formatted);
  } catch (error) {
    return next(error);
  }
});

router.get('/permissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
    return ApiResponse.success(res, permissions);
  } catch (error) {
    return next(error);
  }
});

export const rolesRouter = router;
