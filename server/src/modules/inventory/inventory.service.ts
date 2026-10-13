import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { StockMovementType, StockAdjustmentType, StockAdjustmentStatus, StockTransferStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service.js';

export class InventoryService {
  static async getBalances(query: {
    warehouseId?: string;
    search?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
    }

    if (query.search) {
      where.product = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
          { barcode: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    if (query.outOfStock) {
      where.quantityOnHand = { lte: 0 };
    }

    const [total, balances] = await Promise.all([
      prisma.stockBalance.count({ where }),
      prisma.stockBalance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              costPrice: true,
              sellingPrice: true,
              reorderLevel: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const formatted = balances.map((b) => {
      const qOnHand = Number(b.quantityOnHand);
      const reorder = Number(b.product.reorderLevel);
      const isLowStock = qOnHand <= reorder;
      const isOutOfStock = qOnHand <= 0;
      const valuation = qOnHand * Number(b.product.costPrice);

      return {
        id: b.id,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouse.name,
        warehouseCode: b.warehouse.code,
        productId: b.productId,
        productName: b.product.name,
        productSku: b.product.sku,
        unit: b.product.unit,
        category: b.product.category?.name,
        quantityOnHand: qOnHand,
        allocatedQuantity: Number(b.allocatedQuantity),
        availableQuantity: Number(b.availableQuantity),
        reorderLevel: reorder,
        costPrice: Number(b.product.costPrice),
        sellingPrice: Number(b.product.sellingPrice),
        inventoryValuation: valuation,
        isLowStock,
        isOutOfStock,
        updatedAt: b.updatedAt,
      };
    });

    const filtered = query.lowStock ? formatted.filter((b) => b.isLowStock) : formatted;

    return {
      balances: filtered,
      pagination: {
        page,
        limit,
        total: query.lowStock ? filtered.length : total,
        totalPages: Math.ceil((query.lowStock ? filtered.length : total) / limit),
      },
    };
  }

  static async getMovements(query: {
    warehouseId?: string;
    productId?: string;
    type?: StockMovementType;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          product: { select: { id: true, sku: true, name: true, unit: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createAdjustment(data: {
    warehouseId: string;
    type?: StockAdjustmentType;
    reason?: string;
    notes?: string;
    items: Array<{ productId: string; countedQuantity: number }>;
    userId?: string;
  }) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw AppError.notFound('Warehouse not found');

    const settings = await prisma.businessSettings.findFirst();
    const allowNegative = settings?.allowNegativeStock ?? false;

    const prefix = settings?.adjustmentPrefix || 'ADJ-';
    const adjustmentNumber = `${prefix}${Date.now().toString().slice(-6)}`;

    return await prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          warehouseId: data.warehouseId,
          type: data.type || StockAdjustmentType.RECONCILIATION,
          status: StockAdjustmentStatus.APPLIED,
          reason: data.reason,
          notes: data.notes,
          createdById: data.userId,
          approvedAt: new Date(),
        },
      });

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw AppError.notFound(`Product ID ${item.productId} not found`);

        let balance = await tx.stockBalance.findFirst({
          where: { warehouseId: data.warehouseId, productId: item.productId, productVariantId: null },
        });

        const currentQty = balance ? Number(balance.quantityOnHand) : 0;
        const countedQty = Number(item.countedQuantity);
        const differenceQty = countedQty - currentQty;

        if (countedQty < 0 && !allowNegative) {
          throw AppError.badRequest(`Negative stock not allowed for product "${product.name}"`);
        }

        if (balance) {
          balance = await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              quantityOnHand: countedQty,
              availableQuantity: countedQty - Number(balance.allocatedQuantity),
            },
          });
        } else {
          balance = await tx.stockBalance.create({
            data: {
              warehouseId: data.warehouseId,
              productId: item.productId,
              quantityOnHand: countedQty,
              availableQuantity: countedQty,
              allocatedQuantity: 0,
            },
          });
        }

        // Add line item
        await tx.stockAdjustmentItem.create({
          data: {
            adjustmentId: adjustment.id,
            productId: item.productId,
            systemQuantity: currentQty,
            countedQuantity: countedQty,
            differenceQty,
            unitCost: product.costPrice,
          },
        });

        // Add immutable ledger entry
        if (differenceQty !== 0) {
          const movementType = differenceQty > 0 ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT;
          await tx.stockMovement.create({
            data: {
              warehouseId: data.warehouseId,
              productId: item.productId,
              type: movementType,
              quantity: Math.abs(differenceQty),
              unitCost: product.costPrice,
              balanceAfter: countedQty,
              referenceType: 'STOCK_ADJUSTMENT',
              referenceId: adjustment.id,
              reason: data.reason || `Physical Count Reconciliation (${differenceQty > 0 ? '+' : ''}${differenceQty})`,
              userId: data.userId,
            },
          });
        }
      }

      await AuditService.log({
        userId: data.userId,
        action: 'STOCK_ADJUSTED',
        entityType: 'STOCK_ADJUSTMENT',
        entityId: adjustment.id,
        details: { adjustmentNumber, warehouse: warehouse.name, itemCount: data.items.length },
      });

      return adjustment;
    });
  }

  static async listTransfers(query: { page?: number; limit?: number; status?: StockTransferStatus }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;

    const [total, transfers] = await Promise.all([
      prisma.stockTransfer.count({ where }),
      prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceWarehouse: { select: { id: true, code: true, name: true } },
          destinationWarehouse: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true, unit: true } },
            },
          },
        },
      }),
    ]);

    return {
      transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createTransfer(data: {
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
    userId?: string;
  }) {
    if (data.sourceWarehouseId === data.destinationWarehouseId) {
      throw AppError.badRequest('Source and destination warehouse cannot be the same facility');
    }

    if (!data.items || data.items.length === 0) {
      throw AppError.badRequest('Transfer must contain at least one product');
    }

    const settings = await prisma.businessSettings.findFirst();
    const prefix = settings?.transferPrefix || 'TR-';
    const transferNumber = `${prefix}${Date.now().toString().slice(-6)}`;

    // Validate available stock in source warehouse
    for (const item of data.items) {
      const balance = await prisma.stockBalance.findFirst({
        where: { warehouseId: data.sourceWarehouseId, productId: item.productId, productVariantId: null },
      });

      const available = balance ? Number(balance.availableQuantity) : 0;
      if (available < item.quantity) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        throw AppError.badRequest(
          `Insufficient available stock for "${prod?.name || item.productId}". Available: ${available}, Requested: ${item.quantity}`
        );
      }
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber,
        sourceWarehouseId: data.sourceWarehouseId,
        destinationWarehouseId: data.destinationWarehouseId,
        status: StockTransferStatus.DRAFT,
        notes: data.notes,
        createdById: data.userId,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    await AuditService.log({
      userId: data.userId,
      action: 'TRANSFER_CREATED',
      entityType: 'STOCK_TRANSFER',
      entityId: transfer.id,
      details: { transferNumber },
    });

    return transfer;
  }

  static async dispatchTransfer(transferId: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) throw AppError.notFound('Transfer not found');
      if (transfer.status !== StockTransferStatus.DRAFT) {
        throw AppError.badRequest(`Transfer cannot be dispatched from status "${transfer.status}"`);
      }

      // Deduct stock from source warehouse
      for (const item of transfer.items) {
        const balance = await tx.stockBalance.findFirst({
          where: { warehouseId: transfer.sourceWarehouseId, productId: item.productId, productVariantId: null },
        });

        const currentStock = balance ? Number(balance.quantityOnHand) : 0;
        const requestedQty = Number(item.quantity);

        if (currentStock < requestedQty) {
          throw AppError.badRequest(`Insufficient stock in source warehouse to dispatch transfer`);
        }

        const newStock = currentStock - requestedQty;
        await tx.stockBalance.update({
          where: { id: balance!.id },
          data: {
            quantityOnHand: newStock,
            availableQuantity: Number(balance!.availableQuantity) - requestedQty,
          },
        });

        // Record Transfer Out ledger
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        await tx.stockMovement.create({
          data: {
            warehouseId: transfer.sourceWarehouseId,
            productId: item.productId,
            type: StockMovementType.TRANSFER_OUT,
            quantity: requestedQty,
            unitCost: product?.costPrice || 0,
            balanceAfter: newStock,
            referenceType: 'STOCK_TRANSFER',
            referenceId: transfer.id,
            reason: `Transfer to destination warehouse (${transfer.transferNumber})`,
            userId,
          },
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.DISPATCHED,
          dispatchedAt: new Date(),
        },
      });

      await AuditService.log({
        userId,
        action: 'TRANSFER_DISPATCHED',
        entityType: 'STOCK_TRANSFER',
        entityId: transferId,
      });

      return updated;
    });
  }

  static async receiveTransfer(transferId: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) throw AppError.notFound('Transfer not found');
      if (transfer.status !== StockTransferStatus.DISPATCHED) {
        throw AppError.badRequest(`Transfer cannot be received from status "${transfer.status}"`);
      }

      // Increment stock in destination warehouse
      for (const item of transfer.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const qty = Number(item.quantity);

        let balance = await tx.stockBalance.findFirst({
          where: { warehouseId: transfer.destinationWarehouseId, productId: item.productId, productVariantId: null },
        });

        let newStock = qty;
        if (balance) {
          newStock = Number(balance.quantityOnHand) + qty;
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              quantityOnHand: newStock,
              availableQuantity: Number(balance.availableQuantity) + qty,
            },
          });
        } else {
          balance = await tx.stockBalance.create({
            data: {
              warehouseId: transfer.destinationWarehouseId,
              productId: item.productId,
              quantityOnHand: qty,
              availableQuantity: qty,
              allocatedQuantity: 0,
            },
          });
        }

        // Update item received qty
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQuantity: qty },
        });

        // Record Transfer In ledger
        await tx.stockMovement.create({
          data: {
            warehouseId: transfer.destinationWarehouseId,
            productId: item.productId,
            type: StockMovementType.TRANSFER_IN,
            quantity: qty,
            unitCost: product?.costPrice || 0,
            balanceAfter: newStock,
            referenceType: 'STOCK_TRANSFER',
            referenceId: transfer.id,
            reason: `Transfer received from source warehouse (${transfer.transferNumber})`,
            userId,
          },
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.COMPLETED,
          receivedAt: new Date(),
        },
      });

      await AuditService.log({
        userId,
        action: 'TRANSFER_RECEIVED',
        entityType: 'STOCK_TRANSFER',
        entityId: transferId,
      });

      return updated;
    });
  }
}
