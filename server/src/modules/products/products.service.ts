import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ProductStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service.js';
import { sanitizeCsvField, formatCsvRow } from '../../shared/utils/csv.js';

export class ProductsService {
  static async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    status?: ProductStatus;
    lowStock?: boolean;
    warehouseId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isArchived: false,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.status) where.status = query.status;

    const orderByField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder || 'desc';

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortDirection },
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          stockBalances: {
            include: {
              warehouse: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
    ]);

    const formatted = products.map((p) => {
      const totalStock = p.stockBalances.reduce((acc, sb) => acc + Number(sb.quantityOnHand), 0);
      const isLowStock = totalStock <= Number(p.reorderLevel);

      return {
        ...p,
        totalStock,
        isLowStock,
      };
    });

    const filtered = query.lowStock ? formatted.filter((p) => p.isLowStock) : formatted;

    return {
      products: filtered,
      pagination: {
        page,
        limit,
        total: query.lowStock ? filtered.length : total,
        totalPages: Math.ceil((query.lowStock ? filtered.length : total) / limit),
      },
    };
  }

  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: true,
        images: { orderBy: { sortOrder: 'asc' } },
        stockBalances: {
          include: {
            warehouse: true,
          },
        },
        stockMovements: {
          take: 15,
          orderBy: { createdAt: 'desc' },
          include: {
            warehouse: { select: { name: true, code: true } },
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!product) throw AppError.notFound('Product not found');

    const totalStock = product.stockBalances.reduce((acc, sb) => acc + Number(sb.quantityOnHand), 0);
    const availableStock = product.stockBalances.reduce((acc, sb) => acc + Number(sb.availableQuantity), 0);

    return {
      ...product,
      totalStock,
      availableStock,
      isLowStock: totalStock <= Number(product.reorderLevel),
    };
  }

  static async create(data: {
    name: string;
    sku: string;
    barcode?: string;
    description?: string;
    categoryId?: string;
    brandId?: string;
    unit?: string;
    costPrice?: number;
    sellingPrice?: number;
    taxRate?: number;
    reorderLevel?: number;
    status?: ProductStatus;
    variants?: Array<{ name: string; sku: string; costPrice?: number; sellingPrice?: number }>;
    actorId?: string;
  }) {
    const existingSku = await prisma.product.findUnique({ where: { sku: data.sku.toUpperCase() } });
    if (existingSku) throw AppError.conflict('A product with this SKU already exists');

    if (data.barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } });
      if (existingBarcode) throw AppError.conflict('A product with this Barcode already exists');
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku.toUpperCase(),
        barcode: data.barcode || null,
        description: data.description,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        unit: data.unit || 'pcs',
        costPrice: data.costPrice || 0,
        sellingPrice: data.sellingPrice || 0,
        taxRate: data.taxRate || 0,
        reorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : 10,
        status: data.status || ProductStatus.ACTIVE,
        variants: data.variants && data.variants.length > 0
          ? {
              create: data.variants.map((v) => ({
                name: v.name,
                sku: v.sku.toUpperCase(),
                costPrice: v.costPrice || data.costPrice,
                sellingPrice: v.sellingPrice || data.sellingPrice,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        brand: true,
        variants: true,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: product.id,
      details: { sku: product.sku, name: product.name },
    });

    return product;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      barcode?: string;
      description?: string;
      categoryId?: string;
      brandId?: string;
      unit?: string;
      costPrice?: number;
      sellingPrice?: number;
      taxRate?: number;
      reorderLevel?: number;
      status?: ProductStatus;
      actorId?: string;
    }
  ) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw AppError.notFound('Product not found');

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        barcode: data.barcode,
        description: data.description,
        categoryId: data.categoryId !== undefined ? (data.categoryId || null) : undefined,
        brandId: data.brandId !== undefined ? (data.brandId || null) : undefined,
        unit: data.unit,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        taxRate: data.taxRate,
        reorderLevel: data.reorderLevel,
        status: data.status,
      },
      include: {
        category: true,
        brand: true,
        variants: true,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: id,
      details: { name: updated.name, status: updated.status },
    });

    return updated;
  }

  static async archive(id: string, actorId?: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw AppError.notFound('Product not found');

    const updated = await prisma.product.update({
      where: { id },
      data: { isArchived: true, status: ProductStatus.ARCHIVED },
    });

    await AuditService.log({
      userId: actorId,
      action: 'PRODUCT_ARCHIVED',
      entityType: 'PRODUCT',
      entityId: id,
      details: { sku: product.sku },
    });

    return updated;
  }

  static async exportCsv(): Promise<string> {
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      include: {
        category: true,
        brand: true,
        stockBalances: true,
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['SKU', 'Name', 'Barcode', 'Category', 'Brand', 'Unit', 'Cost Price', 'Selling Price', 'Tax Rate', 'Total Stock', 'Reorder Level', 'Status'];
    const rows = [headers.join(',')];

    for (const p of products) {
      const totalStock = p.stockBalances.reduce((acc, sb) => acc + Number(sb.quantityOnHand), 0);
      const row = [
        sanitizeCsvField(p.sku),
        sanitizeCsvField(p.name),
        sanitizeCsvField(p.barcode || ''),
        sanitizeCsvField(p.category?.name || ''),
        sanitizeCsvField(p.brand?.name || ''),
        sanitizeCsvField(p.unit),
        p.costPrice.toString(),
        p.sellingPrice.toString(),
        p.taxRate.toString(),
        totalStock.toString(),
        p.reorderLevel.toString(),
        p.status,
      ];
      rows.push(formatCsvRow(row));
    }

    return rows.join('\n');
  }

  static async getMovements(productId: string) {
    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        warehouse: { select: { code: true, name: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return movements;
  }
}
