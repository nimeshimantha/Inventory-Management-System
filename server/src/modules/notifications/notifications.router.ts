import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: { isRead: false },
      }),
    ]);

    return ApiResponse.success(res, { notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    return ApiResponse.success(res, updated);
  } catch (error) {
    return next(error);
  }
});

router.patch('/mark-all-read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return ApiResponse.success(res, null, 'All notifications marked as read');
  } catch (error) {
    return next(error);
  }
});

export const notificationsRouter = router;
