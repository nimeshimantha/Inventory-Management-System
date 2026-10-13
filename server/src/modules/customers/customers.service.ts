import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';

export class CustomersService {
  static async list(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { salesOrders: true },
          },
          salesOrders: {
            select: {
              grandTotal: true,
              paidAmount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const formatted = customers.map((c) => {
      const totalSales = c.salesOrders.reduce((acc, so) => acc + Number(so.grandTotal), 0);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        billingAddress: c.billingAddress,
        shippingAddress: c.shippingAddress,
        city: c.city,
        country: c.country,
        creditLimit: c.creditLimit,
        outstandingBalance: c.outstandingBalance,
        isActive: c.isActive,
        createdAt: c.createdAt,
        totalOrdersCount: c._count.salesOrders,
        totalSalesAmount: totalSales,
      };
    });

    return {
      customers: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            warehouse: { select: { name: true } },
          },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) throw AppError.notFound('Customer not found');
    return customer;
  }

  static async create(data: {
    code: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    billingAddress?: string;
    shippingAddress?: string;
    city?: string;
    country?: string;
    creditLimit?: number;
    actorId?: string;
  }) {
    const existing = await prisma.customer.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw AppError.conflict('A customer with this code already exists');

    const customer = await prisma.customer.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        city: data.city,
        country: data.country,
        creditLimit: data.creditLimit || 0,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      details: { code: customer.code, name: customer.name },
    });

    return customer;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      billingAddress?: string;
      shippingAddress?: string;
      city?: string;
      country?: string;
      creditLimit?: number;
      isActive?: boolean;
      actorId?: string;
    }
  ) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw AppError.notFound('Customer not found');

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        city: data.city,
        country: data.country,
        creditLimit: data.creditLimit,
        isActive: data.isActive,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { name: updated.name },
    });

    return updated;
  }
}
