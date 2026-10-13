import { prisma } from '../../config/prisma.js';
import { ProductStatus, SalesOrderStatus, PurchaseOrderStatus } from '@prisma/client';

export class DashboardService {
  static async getMetrics() {
    const [
      totalProducts,
      stockBalances,
      salesOrders,
      purchaseOrders,
      lowStockProducts,
    ] = await Promise.all([
      // Total active products
      prisma.product.count({
        where: { isArchived: false, status: ProductStatus.ACTIVE },
      }),
      // Inventory balances for valuation
      prisma.stockBalance.findMany({
        where: {
          product: { isArchived: false },
        },
        include: {
          product: { select: { costPrice: true, reorderLevel: true } },
        },
      }),
      // Total confirmed/fulfilled sales
      prisma.salesOrder.findMany({
        where: {
          status: { in: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.PARTIALLY_FULFILLED, SalesOrderStatus.FULFILLED] },
        },
        select: { grandTotal: true },
      }),
      // Total approved/received purchases
      prisma.purchaseOrder.findMany({
        where: {
          status: { in: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.RECEIVED] },
        },
        select: { grandTotal: true },
      }),
      // Products with low stock
      prisma.product.findMany({
        where: { isArchived: false, status: ProductStatus.ACTIVE },
        include: {
          stockBalances: { select: { quantityOnHand: true } },
        },
      }),
    ]);

    // Calculate total inventory valuation
    const totalInventoryValue = stockBalances.reduce((acc, sb) => {
      return acc + (Number(sb.quantityOnHand) * Number(sb.product.costPrice));
    }, 0);

    const totalSales = salesOrders.reduce((acc, so) => acc + Number(so.grandTotal), 0);
    const totalPurchases = purchaseOrders.reduce((acc, po) => acc + Number(po.grandTotal), 0);

    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of lowStockProducts) {
      const totalStock = p.stockBalances.reduce((acc, sb) => acc + Number(sb.quantityOnHand), 0);
      if (totalStock <= 0) {
        outOfStockCount++;
      } else if (totalStock <= Number(p.reorderLevel)) {
        lowStockCount++;
      }
    }

    return {
      totalProducts,
      totalInventoryValue,
      totalSales,
      totalPurchases,
      lowStockCount,
      outOfStockCount,
    };
  }

  static async getRevenueTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const [sales, purchases] = await Promise.all([
      prisma.salesOrder.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { not: SalesOrderStatus.CANCELLED },
        },
        select: {
          createdAt: true,
          grandTotal: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { not: PurchaseOrderStatus.CANCELLED },
        },
        select: {
          createdAt: true,
          grandTotal: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Group by Date YYYY-MM-DD
    const trendMap: Record<string, { date: string; sales: number; purchases: number; profit: number }> = {};

    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      trendMap[key] = { date: key, sales: 0, purchases: 0, profit: 0 };
    }

    for (const s of sales) {
      const key = s.createdAt.toISOString().split('T')[0];
      if (trendMap[key]) {
        trendMap[key].sales += Number(s.grandTotal);
      }
    }

    for (const p of purchases) {
      const key = p.createdAt.toISOString().split('T')[0];
      if (trendMap[key]) {
        trendMap[key].purchases += Number(p.grandTotal);
      }
    }

    const trends = Object.values(trendMap).map((t) => ({
      ...t,
      profit: t.sales - t.purchases,
    }));

    return trends;
  }

  static async getTopProducts(limit = 5) {
    const topItems = await prisma.salesOrderItem.groupBy({
      by: ['productId'],
      _sum: {
        fulfilledQuantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    const results = [];
    for (const item of topItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          category: { select: { name: true } },
        },
      });

      if (product) {
        results.push({
          product,
          unitsSold: Number(item._sum.fulfilledQuantity || 0),
          totalRevenue: Number(item._sum.total || 0),
        });
      }
    }

    return results;
  }

  static async getRecentActivity() {
    const [recentSales, recentPurchases, recentMovements] = await Promise.all([
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
      }),
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { companyName: true } },
          warehouse: { select: { name: true } },
        },
      }),
      prisma.stockMovement.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      recentSales,
      recentPurchases,
      recentMovements,
    };
  }

  static async getLowStockAlerts(limit = 6) {
    const products = await prisma.product.findMany({
      where: { isArchived: false, status: ProductStatus.ACTIVE },
      include: {
        category: { select: { name: true } },
        stockBalances: {
          include: {
            warehouse: { select: { code: true, name: true } },
          },
        },
      },
    });

    const lowStockList = [];

    for (const p of products) {
      const currentStock = p.stockBalances.reduce((acc, sb) => acc + Number(sb.quantityOnHand), 0);
      const reorder = Number(p.reorderLevel);

      if (currentStock <= reorder) {
        lowStockList.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          category: p.category?.name,
          currentStock,
          reorderLevel: reorder,
          costPrice: Number(p.costPrice),
          deficit: Math.max(0, reorder - currentStock),
          isOutOfStock: currentStock <= 0,
          warehouseBreakdown: p.stockBalances.map((sb) => ({
            warehouseName: sb.warehouse.name,
            qty: Number(sb.quantityOnHand),
          })),
        });
      }
    }

    lowStockList.sort((a, b) => a.currentStock - b.currentStock);

    return lowStockList.slice(0, limit);
  }
}
