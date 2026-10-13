import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';

export class SuppliersService {
  static async list(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { companyName: 'asc' },
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
          purchaseOrders: {
            select: {
              grandTotal: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const formatted = suppliers.map((s) => {
      const totalPurchases = s.purchaseOrders.reduce((acc, po) => acc + Number(po.grandTotal), 0);
      return {
        id: s.id,
        code: s.code,
        companyName: s.companyName,
        contactPerson: s.contactPerson,
        email: s.email,
        phone: s.phone,
        address: s.address,
        city: s.city,
        country: s.country,
        taxId: s.taxId,
        paymentTerms: s.paymentTerms,
        isActive: s.isActive,
        createdAt: s.createdAt,
        totalOrdersCount: s._count.purchaseOrders,
        totalPurchasesAmount: totalPurchases,
      };
    });

    return {
      suppliers: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            warehouse: { select: { name: true } },
          },
        },
      },
    });

    if (!supplier) throw AppError.notFound('Supplier not found');
    return supplier;
  }

  static async create(data: {
    code: string;
    companyName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    taxId?: string;
    paymentTerms?: string;
    actorId?: string;
  }) {
    const existing = await prisma.supplier.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw AppError.conflict('A supplier with this code already exists');

    const supplier = await prisma.supplier.create({
      data: {
        code: data.code.toUpperCase(),
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        taxId: data.taxId,
        paymentTerms: data.paymentTerms || 'Net 30',
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIER',
      entityId: supplier.id,
      details: { code: supplier.code, companyName: supplier.companyName },
    });

    return supplier;
  }

  static async update(
    id: string,
    data: {
      companyName?: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      taxId?: string;
      paymentTerms?: string;
      isActive?: boolean;
      actorId?: string;
    }
  ) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw AppError.notFound('Supplier not found');

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        taxId: data.taxId,
        paymentTerms: data.paymentTerms,
        isActive: data.isActive,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'SUPPLIER_UPDATED',
      entityType: 'SUPPLIER',
      entityId: id,
      details: { companyName: updated.companyName },
    });

    return updated;
  }
}
