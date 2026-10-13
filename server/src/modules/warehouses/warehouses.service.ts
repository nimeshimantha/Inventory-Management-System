import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';

export class WarehousesService {
  static async list() {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: { stockBalances: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return warehouses;
  }

  static async getById(id: string) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        stockBalances: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                costPrice: true,
                sellingPrice: true,
              },
            },
          },
        },
      },
    });

    if (!warehouse) throw AppError.notFound('Warehouse not found');
    return warehouse;
  }

  static async create(data: {
    code: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    isDefault?: boolean;
    actorId?: string;
  }) {
    const existing = await prisma.warehouse.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw AppError.conflict('A warehouse with this code already exists');

    if (data.isDefault) {
      await prisma.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country || 'United States',
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        isDefault: data.isDefault || false,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'WAREHOUSE_CREATED',
      entityType: 'WAREHOUSE',
      entityId: warehouse.id,
      details: { code: warehouse.code, name: warehouse.name },
    });

    return warehouse;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      contactName?: string;
      phone?: string;
      email?: string;
      isDefault?: boolean;
      isActive?: boolean;
      actorId?: string;
    }
  ) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw AppError.notFound('Warehouse not found');

    if (data.isDefault) {
      await prisma.warehouse.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        isDefault: data.isDefault,
        isActive: data.isActive,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'WAREHOUSE_UPDATED',
      entityType: 'WAREHOUSE',
      entityId: id,
      details: { name: updated.name },
    });

    return updated;
  }
}
