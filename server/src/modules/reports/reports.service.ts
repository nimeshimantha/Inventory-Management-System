import { prisma } from '../../config/prisma.js';
import { SalesOrderStatus, PurchaseOrderStatus, StockMovementType } from '@prisma/client';

export class ReportsService {
  static async getValuationReport(query: { warehouseId?: string; categoryId?: string }) {
    const where: Record<string, unknown> = {
      product: { isArchived: false },
    };

    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.categoryId) where.product = { ...where.product as object, categoryId: query.categoryId };

    const balances = await prisma.stockBalance.findMany({
      where,
      include: {
        warehouse: { select: { code: true, name: true } },
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            costPrice: true,
            sellingPrice: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
    });

    let totalUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const items = balances.map((b) => {
      const qty = Number(b.quantityOnHand);
      const cost = Number(b.product.costPrice);
      const retail = Number(b.product.sellingPrice);
      const totalCost = qty * cost;
      const totalRetail = qty * retail;
      const margin = retail > 0 ? ((retail - cost) / retail) * 100 : 0;

      totalUnits += qty;
      totalCostValuation += totalCost;
      totalRetailValuation += totalRetail;

      return {
        id: b.id,
        warehouse: b.warehouse.name,
        warehouseCode: b.warehouse.code,
        sku: b.product.sku,
        name: b.product.name,
        unit: b.product.unit,
        category: b.product.category?.name || 'Uncategorized',
        quantityOnHand: qty,
        unitCost: cost,
        unitRetail: retail,
        totalCost,
        totalRetail,
        marginPercent: Math.round(margin * 100) / 100,
      };
    });

    return {
      summary: {
        totalItems: items.length,
        totalUnits,
        totalCostValuation,
        totalRetailValuation,
        projectedGrossProfit: totalRetailValuation - totalCostValuation,
        averageMarginPercent: totalRetailValuation > 0
          ? Math.round(((totalRetailValuation - totalCostValuation) / totalRetailValuation) * 10000) / 100
          : 0,
      },
      items,
    };
  }

  static async getSalesReport(query: { startDate?: string; endDate?: string; customerId?: string; warehouseId?: string }) {
    const where: Record<string, unknown> = {
      status: { not: SalesOrderStatus.CANCELLED },
    };

    if (query.startDate) where.createdAt = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt as object || {}), lte: end };
    }
    if (query.customerId) where.customerId = query.customerId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    const orders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { name: true, code: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalSubtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalGrandTotal = 0;
    let totalPaid = 0;

    for (const o of orders) {
      totalSubtotal += Number(o.subtotal);
      totalTax += Number(o.taxAmount);
      totalDiscount += Number(o.discountAmount);
      totalGrandTotal += Number(o.grandTotal);
      totalPaid += Number(o.paidAmount);
    }

    return {
      summary: {
        orderCount: orders.length,
        totalSubtotal,
        totalTax,
        totalDiscount,
        totalGrandTotal,
        totalPaid,
        totalOutstanding: totalGrandTotal - totalPaid,
      },
      orders,
    };
  }

  static async getPurchasesReport(query: { startDate?: string; endDate?: string; supplierId?: string; warehouseId?: string }) {
    const where: Record<string, unknown> = {
      status: { not: PurchaseOrderStatus.CANCELLED },
    };

    if (query.startDate) where.createdAt = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt as object || {}), lte: end };
    }
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { companyName: true, code: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalSpend = 0;
    for (const o of orders) {
      totalSpend += Number(o.grandTotal);
    }

    return {
      summary: {
        orderCount: orders.length,
        totalSpend,
      },
      orders,
    };
  }

  static async getProfitMarginReport(query: { startDate?: string; endDate?: string }) {
    const where: Record<string, unknown> = {
      status: SalesOrderStatus.FULFILLED,
    };

    if (query.startDate) where.fulfilledAt = { gte: new Date(query.startDate) };
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.fulfilledAt = { ...(where.fulfilledAt as object || {}), lte: end };
    }

    const fulfilledOrders = await prisma.salesOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { costPrice: true, name: true, sku: true } },
          },
        },
      },
    });

    let grossRevenue = 0;
    let costOfGoodsSold = 0;

    for (const order of fulfilledOrders) {
      for (const line of order.items) {
        const qty = Number(line.fulfilledQuantity);
        const revenue = Number(line.total);
        const cost = qty * Number(line.product.costPrice);

        grossRevenue += revenue;
        costOfGoodsSold += cost;
      }
    }

    const grossProfit = grossRevenue - costOfGoodsSold;
    const profitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      costOfGoodsSold,
      grossProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      fulfilledOrdersCount: fulfilledOrders.length,
    };
  }
}
