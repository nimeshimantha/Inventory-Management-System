import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRole } from '../../middleware/authorize.js';
import { AuditService } from '../audit/audit.service.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          businessName: 'StockFlow Global Logistics & Supply',
          currencyCode: 'USD',
          currencySymbol: '$',
          timezone: 'America/Chicago',
          taxRateDefault: 8.25,
          invoicePrefix: 'INV-',
          purchaseOrderPrefix: 'PO-',
          salesOrderPrefix: 'SO-',
          transferPrefix: 'TR-',
          adjustmentPrefix: 'ADJ-',
          lowStockDefaultThreshold: 15.0,
          allowNegativeStock: false,
          costingMethod: 'WEIGHTED_AVERAGE',
        },
      });
    }

    return ApiResponse.success(res, settings);
  } catch (error) {
    return next(error);
  }
});

router.put('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await prisma.businessSettings.create({ data: req.body });
    } else {
      settings = await prisma.businessSettings.update({
        where: { id: settings.id },
        data: {
          businessName: req.body.businessName,
          businessLogoUrl: req.body.businessLogoUrl,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address,
          city: req.body.city,
          country: req.body.country,
          currencyCode: req.body.currencyCode,
          currencySymbol: req.body.currencySymbol,
          timezone: req.body.timezone,
          taxRateDefault: req.body.taxRateDefault !== undefined ? Number(req.body.taxRateDefault) : undefined,
          invoicePrefix: req.body.invoicePrefix,
          purchaseOrderPrefix: req.body.purchaseOrderPrefix,
          salesOrderPrefix: req.body.salesOrderPrefix,
          transferPrefix: req.body.transferPrefix,
          adjustmentPrefix: req.body.adjustmentPrefix,
          lowStockDefaultThreshold: req.body.lowStockDefaultThreshold !== undefined ? Number(req.body.lowStockDefaultThreshold) : undefined,
          allowNegativeStock: req.body.allowNegativeStock,
          costingMethod: req.body.costingMethod,
        },
      });
    }

    await AuditService.log({
      userId: req.user?.id,
      action: 'SETTINGS_UPDATED',
      entityType: 'BUSINESS_SETTINGS',
      entityId: settings.id,
      details: { businessName: settings.businessName },
    });

    return ApiResponse.success(res, settings, 'Settings updated successfully');
  } catch (error) {
    return next(error);
  }
});

export const settingsRouter = router;
