import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { PurchaseOrderStatus, StockMovementType } from '@prisma/client';
import { AuditService } from '../audit/audit.service.js';

export class PurchasesService {
  static async list(query: {
    status?: PurchaseOrderStatus;
    supplierId?: string;
    warehouseId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, code: true, companyName: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true, goodsReceipts: true } },
        },
      }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true, costPrice: true } },
          },
        },
        goodsReceipts: {
          include: {
            receivedBy: { select: { firstName: true, lastName: true } },
            items: {
              include: {
                product: { select: { name: true, sku: true } },
              },
            },
          },
        },
        returns: {
          include: {
            items: {
              include: {
                product: { select: { name: true, sku: true } },
              },
            },
          },
        },
      },
    });

    if (!order) throw AppError.notFound('Purchase order not found');
    return order;
  }

  static async create(data: {
    supplierId: string;
    warehouseId: string;
    notes?: string;
    expectedAt?: string;
    items: Array<{
      productId: string;
      orderedQuantity: number;
      unitCost: number;
      taxRate?: number;
    }>;
    userId?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw AppError.badRequest('Purchase order must contain at least one item');
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw AppError.notFound('Supplier not found');

    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw AppError.notFound('Warehouse not found');

    const settings = await prisma.businessSettings.findFirst();
    const prefix = settings?.purchaseOrderPrefix || 'PO-';
    const orderNumber = `${prefix}${Date.now().toString().slice(-6)}`;

    let subtotal = 0;
    let taxAmount = 0;

    const lineItemsData = data.items.map((item) => {
      const lineSubtotal = item.orderedQuantity * item.unitCost;
      const rate = item.taxRate !== undefined ? item.taxRate : Number(settings?.taxRateDefault || 0);
      const lineTax = (lineSubtotal * rate) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        productId: item.productId,
        orderedQuantity: item.orderedQuantity,
        unitCost: item.unitCost,
        subtotal: lineSubtotal,
        taxRate: rate,
        taxAmount: lineTax,
        total: lineTotal,
      };
    });

    const grandTotal = subtotal + taxAmount;

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        status: PurchaseOrderStatus.DRAFT,
        subtotal,
        taxAmount,
        discountAmount: 0,
        grandTotal,
        notes: data.notes,
        createdById: data.userId,
        orderedAt: new Date(),
        expectedAt: data.expectedAt ? new Date(data.expectedAt) : undefined,
        items: {
          create: lineItemsData,
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    await AuditService.log({
      userId: data.userId,
      action: 'PURCHASE_ORDER_CREATED',
      entityType: 'PURCHASE_ORDER',
      entityId: order.id,
      details: { orderNumber, grandTotal },
    });

    return order;
  }

  static async approve(id: string, userId?: string) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw AppError.notFound('Purchase order not found');

    if (order.status !== PurchaseOrderStatus.DRAFT && order.status !== PurchaseOrderStatus.SUBMITTED) {
      throw AppError.badRequest(`Order cannot be approved from status "${order.status}"`);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    await AuditService.log({
      userId,
      action: 'PURCHASE_ORDER_APPROVED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: { orderNumber: order.orderNumber },
    });

    return updated;
  }

  static async receiveGoods(
    orderId: string,
    data: {
      items: Array<{ productId: string; receivedQuantity: number }>;
      notes?: string;
      userId?: string;
    }
  ) {
    if (!data.items || data.items.length === 0) {
      throw AppError.badRequest('At least one item must be received');
    }

    return await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw AppError.notFound('Purchase order not found');

      if (order.status !== PurchaseOrderStatus.APPROVED && order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
        throw AppError.badRequest(`Cannot receive goods for purchase order in status "${order.status}"`);
      }

      const receiptNumber = `GR-${Date.now().toString().slice(-6)}`;
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: order.id,
          warehouseId: order.warehouseId,
          notes: data.notes,
          receivedById: data.userId,
        },
      });

      const receiptItemsData = [];

      for (const receiveItem of data.items) {
        const orderLine = order.items.find((i) => i.productId === receiveItem.productId);
        if (!orderLine) {
          throw AppError.badRequest(`Product ID ${receiveItem.productId} was not part of this purchase order`);
        }

        const currentReceived = Number(orderLine.receivedQuantity);
        const ordered = Number(orderLine.orderedQuantity);
        const newlyReceived = Number(receiveItem.receivedQuantity);

        if (newlyReceived <= 0) continue;

        if (currentReceived + newlyReceived > ordered) {
          throw AppError.badRequest(
            `Cannot receive ${newlyReceived} units. Maximum remaining to receive is ${ordered - currentReceived}.`
          );
        }

        const updatedReceivedTotal = currentReceived + newlyReceived;
        await tx.purchaseOrderItem.update({
          where: { id: orderLine.id },
          data: { receivedQuantity: updatedReceivedTotal },
        });

        receiptItemsData.push({
          goodsReceiptId: receipt.id,
          productId: receiveItem.productId,
          receivedQuantity: newlyReceived,
          unitCost: orderLine.unitCost,
        });

        // Update Stock Balance in warehouse atomically
        let balance = await tx.stockBalance.findFirst({
          where: { warehouseId: order.warehouseId, productId: receiveItem.productId, productVariantId: null },
        });

        let newStock = newlyReceived;
        if (balance) {
          newStock = Number(balance.quantityOnHand) + newlyReceived;
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              quantityOnHand: newStock,
              availableQuantity: Number(balance.availableQuantity) + newlyReceived,
            },
          });
        } else {
          balance = await tx.stockBalance.create({
            data: {
              warehouseId: order.warehouseId,
              productId: receiveItem.productId,
              quantityOnHand: newlyReceived,
              availableQuantity: newlyReceived,
              allocatedQuantity: 0,
            },
          });
        }

        // Weighted Average Costing update on Product
        const product = await tx.product.findUnique({ where: { id: receiveItem.productId } });
        if (product) {
          const currentCost = Number(product.costPrice);
          const incomingCost = Number(orderLine.unitCost);
          const previousStock = newStock - newlyReceived;
          const weightedCost = previousStock <= 0
            ? incomingCost
            : ((previousStock * currentCost) + (newlyReceived * incomingCost)) / newStock;

          await tx.product.update({
            where: { id: product.id },
            data: { costPrice: weightedCost },
          });
        }

        // Write immutable Stock Movement ledger entry
        await tx.stockMovement.create({
          data: {
            warehouseId: order.warehouseId,
            productId: receiveItem.productId,
            type: StockMovementType.PURCHASE_RECEIPT,
            quantity: newlyReceived,
            unitCost: orderLine.unitCost,
            balanceAfter: newStock,
            referenceType: 'GOODS_RECEIPT',
            referenceId: receipt.id,
            reason: `Purchase Receipt from ${order.orderNumber} (${receiptNumber})`,
            userId: data.userId,
          },
        });
      }

      await tx.goodsReceiptItem.createMany({
        data: receiptItemsData,
      });

      // Check if all items in order are fully received
      const updatedLines = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
      const allFullyReceived = updatedLines.every((l) => Number(l.receivedQuantity) >= Number(l.orderedQuantity));

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: allFullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED,
        },
      });

      await AuditService.log({
        userId: data.userId,
        action: 'GOODS_RECEIVED',
        entityType: 'GOODS_RECEIPT',
        entityId: receipt.id,
        details: { receiptNumber, orderNumber: order.orderNumber, status: allFullyReceived ? 'FULL' : 'PARTIAL' },
      });

      return receipt;
    });
  }
}
