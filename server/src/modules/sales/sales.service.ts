import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { SalesOrderStatus, PaymentStatus, StockMovementType, PaymentMethod } from '@prisma/client';
import { AuditService } from '../audit/audit.service.js';

export class SalesService {
  static async list(query: {
    status?: SalesOrderStatus;
    paymentStatus?: PaymentStatus;
    customerId?: string;
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
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.customerId) where.customerId = query.customerId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.salesOrder.count({ where }),
      prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, code: true, name: true, email: true, phone: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
          invoices: { select: { id: true, invoiceNumber: true, status: true, grandTotal: true, paidAmount: true } },
          _count: { select: { items: true } },
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
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        warehouse: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true, costPrice: true } },
          },
        },
        invoices: {
          include: {
            payments: true,
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

    if (!order) throw AppError.notFound('Sales order not found');
    return order;
  }

  static async create(data: {
    customerId: string;
    warehouseId: string;
    notes?: string;
    discountAmount?: number;
    items: Array<{
      productId: string;
      orderedQuantity: number;
      unitPrice?: number;
      taxRate?: number;
    }>;
    userId?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw AppError.badRequest('Sales order must contain at least one item');
    }

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw AppError.notFound('Customer not found');

    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw AppError.notFound('Warehouse not found');

    const settings = await prisma.businessSettings.findFirst();
    const prefix = settings?.salesOrderPrefix || 'SO-';
    const orderNumber = `${prefix}${Date.now().toString().slice(-6)}`;
    const invoicePrefix = settings?.invoicePrefix || 'INV-';
    const invoiceNumber = `${invoicePrefix}${Date.now().toString().slice(-6)}`;

    return await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxAmount = 0;

      const lineItems = [];

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw AppError.notFound(`Product ID ${item.productId} not found`);

        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : Number(product.sellingPrice);
        const lineSubtotal = item.orderedQuantity * unitPrice;
        const rate = item.taxRate !== undefined ? item.taxRate : Number(product.taxRate || settings?.taxRateDefault || 0);
        const lineTax = (lineSubtotal * rate) / 100;
        const lineTotal = lineSubtotal + lineTax;

        subtotal += lineSubtotal;
        taxAmount += lineTax;

        lineItems.push({
          productId: item.productId,
          orderedQuantity: item.orderedQuantity,
          fulfilledQuantity: 0,
          unitPrice,
          subtotal: lineSubtotal,
          taxRate: rate,
          taxAmount: lineTax,
          total: lineTotal,
        });

        // Reserve stock (Increment allocatedQuantity so other orders don't claim it)
        const balance = await tx.stockBalance.findFirst({
          where: { warehouseId: data.warehouseId, productId: item.productId, productVariantId: null },
        });

        if (balance) {
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              allocatedQuantity: Number(balance.allocatedQuantity) + item.orderedQuantity,
              availableQuantity: Number(balance.availableQuantity) - item.orderedQuantity,
            },
          });
        }
      }

      const discount = data.discountAmount || 0;
      const grandTotal = Math.max(0, subtotal + taxAmount - discount);

      // Create Sales Order
      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          warehouseId: data.warehouseId,
          status: SalesOrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.UNPAID,
          subtotal,
          taxAmount,
          discountAmount: discount,
          grandTotal,
          paidAmount: 0,
          notes: data.notes,
          createdById: data.userId,
          items: {
            create: lineItems,
          },
        },
      });

      // Generate associated Invoice
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Net 30 default

      await tx.invoice.create({
        data: {
          invoiceNumber,
          salesOrderId: order.id,
          dueDate,
          subtotal,
          taxAmount,
          grandTotal,
          paidAmount: 0,
          status: PaymentStatus.UNPAID,
          notes: `Invoice for ${orderNumber}`,
        },
      });

      // Update customer outstanding balance
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          outstandingBalance: Number(customer.outstandingBalance) + grandTotal,
        },
      });

      await AuditService.log({
        userId: data.userId,
        action: 'SALES_ORDER_CREATED',
        entityType: 'SALES_ORDER',
        entityId: order.id,
        details: { orderNumber, invoiceNumber, grandTotal },
      });

      return order;
    });
  }

  static async fulfillOrder(orderId: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw AppError.notFound('Sales order not found');

      if (order.status !== SalesOrderStatus.CONFIRMED && order.status !== SalesOrderStatus.PARTIALLY_FULFILLED) {
        throw AppError.badRequest(`Cannot fulfill order in status "${order.status}"`);
      }

      for (const line of order.items) {
        const remainingToFulfill = Number(line.orderedQuantity) - Number(line.fulfilledQuantity);
        if (remainingToFulfill <= 0) continue;

        const balance = await tx.stockBalance.findFirst({
          where: { warehouseId: order.warehouseId, productId: line.productId, productVariantId: null },
        });

        const currentStock = balance ? Number(balance.quantityOnHand) : 0;
        if (currentStock < remainingToFulfill) {
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          throw AppError.badRequest(
            `Insufficient physical inventory to fulfill "${product?.name || line.productId}". In stock: ${currentStock}, Required: ${remainingToFulfill}`
          );
        }

        const newStock = currentStock - remainingToFulfill;
        const newAllocated = Math.max(0, Number(balance!.allocatedQuantity) - remainingToFulfill);

        await tx.stockBalance.update({
          where: { id: balance!.id },
          data: {
            quantityOnHand: newStock,
            allocatedQuantity: newAllocated,
          },
        });

        // Update fulfilled quantity on order line
        await tx.salesOrderItem.update({
          where: { id: line.id },
          data: {
            fulfilledQuantity: line.orderedQuantity,
          },
        });

        // Write immutable Stock Movement ledger entry
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        await tx.stockMovement.create({
          data: {
            warehouseId: order.warehouseId,
            productId: line.productId,
            type: StockMovementType.SALES_FULFILLMENT,
            quantity: remainingToFulfill,
            unitCost: product?.costPrice || 0,
            balanceAfter: newStock,
            referenceType: 'SALES_ORDER',
            referenceId: order.id,
            reason: `Sales Fulfillment for Order ${order.orderNumber}`,
            userId,
          },
        });
      }

      const updated = await tx.salesOrder.update({
        where: { id: orderId },
        data: {
          status: SalesOrderStatus.FULFILLED,
          fulfilledAt: new Date(),
        },
      });

      await AuditService.log({
        userId,
        action: 'SALES_ORDER_FULFILLED',
        entityType: 'SALES_ORDER',
        entityId: orderId,
        details: { orderNumber: order.orderNumber },
      });

      return updated;
    });
  }

  static async recordPayment(
    orderId: string,
    data: {
      amount: number;
      paymentMethod?: PaymentMethod;
      referenceNumber?: string;
      notes?: string;
      userId?: string;
    }
  ) {
    if (data.amount <= 0) {
      throw AppError.badRequest('Payment amount must be greater than zero');
    }

    return await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: { invoices: true, customer: true },
      });

      if (!order) throw AppError.notFound('Sales order not found');

      const invoice = order.invoices[0];
      if (!invoice) throw AppError.notFound('Associated invoice not found');

      const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          customerId: order.customerId,
          amount: data.amount,
          paymentMethod: data.paymentMethod || PaymentMethod.BANK_TRANSFER,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
        },
      });

      const updatedPaid = Number(invoice.paidAmount) + data.amount;
      const grandTotal = Number(invoice.grandTotal);
      const isPaidFull = updatedPaid >= grandTotal;
      const newStatus = isPaidFull ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: updatedPaid,
          status: newStatus,
        },
      });

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          paidAmount: updatedPaid,
          paymentStatus: newStatus,
        },
      });

      // Reduce customer outstanding balance
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          outstandingBalance: Math.max(0, Number(order.customer.outstandingBalance) - data.amount),
        },
      });

      await AuditService.log({
        userId: data.userId,
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        details: { paymentNumber, amount: data.amount, invoiceNumber: invoice.invoiceNumber },
      });

      return payment;
    });
  }

  static async processReturn(
    orderId: string,
    data: {
      reason?: string;
      restockInventory?: boolean;
      items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
      userId?: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) throw AppError.notFound('Sales order not found');

      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
      let refundAmount = 0;

      const returnLines = [];
      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const price = item.unitPrice || Number(product?.sellingPrice || 0);
        const lineTotal = item.quantity * price;
        refundAmount += lineTotal;

        returnLines.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: price,
          total: lineTotal,
        });

        if (data.restockInventory) {
          let balance = await tx.stockBalance.findFirst({
            where: { warehouseId: order.warehouseId, productId: item.productId, productVariantId: null },
          });

          let newStock = item.quantity;
          if (balance) {
            newStock = Number(balance.quantityOnHand) + item.quantity;
            await tx.stockBalance.update({
              where: { id: balance.id },
              data: {
                quantityOnHand: newStock,
                availableQuantity: Number(balance.availableQuantity) + item.quantity,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              warehouseId: order.warehouseId,
              productId: item.productId,
              type: StockMovementType.SALES_RETURN,
              quantity: item.quantity,
              unitCost: product?.costPrice || 0,
              balanceAfter: newStock,
              referenceType: 'SALES_RETURN',
              referenceId: returnNumber,
              reason: `Customer Return Restock (${data.reason || 'Restocked'})`,
              userId: data.userId,
            },
          });
        }
      }

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNumber,
          salesOrderId: order.id,
          reason: data.reason,
          refundAmount,
          restocked: !!data.restockInventory,
          items: {
            create: returnLines,
          },
        },
      });

      await AuditService.log({
        userId: data.userId,
        action: 'SALES_RETURN_PROCESSED',
        entityType: 'SALES_RETURN',
        entityId: salesReturn.id,
        details: { returnNumber, refundAmount, restocked: data.restockInventory },
      });

      return salesReturn;
    });
  }
}
