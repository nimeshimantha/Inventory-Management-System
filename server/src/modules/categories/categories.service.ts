import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';

export class CategoriesService {
  static async list(query: { search?: string; parentOnly?: boolean }) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.parentOnly) {
      where.parentId = null;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId,
      parent: c.parent,
      children: c.children,
      productCount: c._count.products,
      createdAt: c.createdAt,
    }));
  }

  static async create(data: { name: string; slug?: string; description?: string; parentId?: string; actorId?: string }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) throw AppError.conflict('A category with this name or slug already exists');

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        parentId: data.parentId || null,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'CATEGORY_CREATED',
      entityType: 'CATEGORY',
      entityId: category.id,
      details: { name: category.name, slug: category.slug },
    });

    return category;
  }

  static async update(id: string, data: { name?: string; slug?: string; description?: string; parentId?: string; actorId?: string }) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw AppError.notFound('Category not found');

    if (data.parentId && data.parentId === id) {
      throw AppError.badRequest('A category cannot be its own parent');
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId !== undefined ? (data.parentId || null) : undefined,
      },
    });

    await AuditService.log({
      userId: data.actorId,
      action: 'CATEGORY_UPDATED',
      entityType: 'CATEGORY',
      entityId: id,
      details: { name: updated.name },
    });

    return updated;
  }

  static async delete(id: string, actorId?: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) throw AppError.notFound('Category not found');

    if (category._count.products > 0) {
      throw AppError.badRequest(
        `Cannot delete category "${category.name}" because it is currently assigned to ${category._count.products} product(s). Please reassign products first.`
      );
    }

    if (category._count.children > 0) {
      throw AppError.badRequest(
        `Cannot delete category "${category.name}" because it contains ${category._count.children} subcategories.`
      );
    }

    await prisma.category.delete({ where: { id } });

    await AuditService.log({
      userId: actorId,
      action: 'CATEGORY_DELETED',
      entityType: 'CATEGORY',
      entityId: id,
      details: { name: category.name },
    });

    return { id };
  }
}
