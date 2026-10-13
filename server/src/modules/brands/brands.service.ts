import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';

export class BrandsService {
  static async list(query: { search?: string }) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const brands = await prisma.brand.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      logoUrl: b.logoUrl,
      productCount: b._count.products,
      createdAt: b.createdAt,
    }));
  }

  static async create(data: { name: string; slug?: string; description?: string; logoUrl?: string; actorId?: string }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) throw AppError.conflict('A brand with this name or slug already exists');

    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        logoUrl: data.logoUrl,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'BRAND_CREATED',
      entityType: 'BRAND',
      entityId: brand.id,
      details: { name: brand.name },
    });

    return brand;
  }

  static async update(id: string, data: { name?: string; slug?: string; description?: string; logoUrl?: string; actorId?: string }) {
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) throw AppError.notFound('Brand not found');

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        logoUrl: data.logoUrl,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'BRAND_UPDATED',
      entityType: 'BRAND',
      entityId: id,
      details: { name: updated.name },
    });

    return updated;
  }

  static async delete(id: string, actorId?: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!brand) throw AppError.notFound('Brand not found');

    if (brand._count.products > 0) {
      throw AppError.badRequest(
        `Cannot delete brand "${brand.name}" because it is currently assigned to ${brand._count.products} product(s). Please reassign products first.`
      );
    }

    await prisma.brand.delete({ where: { id } });

    await AuditService.log({
      userId: actorId,
      action: 'BRAND_DELETED',
      entityType: 'BRAND',
      entityId: id,
      details: { name: brand.name },
    });

    return { id };
  }
}
