import { Request, Response, NextFunction } from 'express';
import { ProductsService } from './products.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { ProductStatus } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../../config/index.js';
import { AppError } from '../../shared/errors/AppError.js';
import { prisma } from '../../config/prisma.js';

// Setup upload directory
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `prod-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.', 400));
    }
  },
});

export class ProductsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductsService.list({
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        brandId: req.query.brandId as string,
        status: req.query.status as ProductStatus,
        lowStock: req.query.lowStock === 'true',
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });

      return ApiResponse.success(res, result.products, 'Products retrieved successfully', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductsService.getById(req.params.id);
      return ApiResponse.success(res, product);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductsService.create({
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.created(res, product, 'Product created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductsService.update(req.params.id, {
        ...req.body,
        actorId: req.user?.id,
      });
      return ApiResponse.success(res, product, 'Product updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductsService.archive(req.params.id, req.user?.id);
      return ApiResponse.success(res, result, 'Product archived successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const csv = await ProductsService.exportCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stockflow-products.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return next(error);
    }
  }

  static async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const movements = await ProductsService.getMovements(req.params.id);
      return ApiResponse.success(res, movements);
    } catch (error) {
      return next(error);
    }
  }

  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400);
      }

      const product = await prisma.product.findUnique({ where: { id: req.params.id } });
      if (!product) throw new AppError('Product not found', 404);

      const imageUrl = `/uploads/${req.file.filename}`;
      const image = await prisma.productImage.create({
        data: {
          productId: product.id,
          url: imageUrl,
          fileName: req.file.filename,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          isPrimary: req.body.isPrimary === 'true',
        },
      });

      return ApiResponse.created(res, image, 'Product image uploaded successfully');
    } catch (error) {
      return next(error);
    }
  }
}
