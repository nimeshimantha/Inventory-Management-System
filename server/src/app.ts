import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/index.js';
import { prisma } from './config/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiResponse } from './shared/utils/apiResponse.js';

// Routers
import { authRouter } from './modules/auth/auth.router.js';
import { usersRouter } from './modules/users/users.router.js';
import { rolesRouter } from './modules/roles/roles.router.js';
import { productsRouter } from './modules/products/products.router.js';
import { categoriesRouter } from './modules/categories/categories.router.js';
import { brandsRouter } from './modules/brands/brands.router.js';
import { warehousesRouter } from './modules/warehouses/warehouses.router.js';
import { suppliersRouter } from './modules/suppliers/suppliers.router.js';
import { customersRouter } from './modules/customers/customers.router.js';
import { inventoryRouter } from './modules/inventory/inventory.router.js';
import { purchasesRouter } from './modules/purchases/purchases.router.js';
import { salesRouter } from './modules/sales/sales.router.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';
import { reportsRouter } from './modules/reports/reports.router.js';
import { notificationsRouter } from './modules/notifications/notifications.router.js';
import { settingsRouter } from './modules/settings/settings.router.js';
import { auditRouter } from './modules/audit/audit.router.js';

export const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

// Rate limiting (1000 requests per 15 min for general endpoints)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static file serving for uploaded product images
app.use('/uploads', express.static(config.uploadDir));

// System Health Check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'CONNECTED',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database check failed';
    return res.status(503).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: message,
    });
  }
});

// Swagger OpenAPI documentation
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'StockFlow Enterprise Inventory API',
    version: '1.0.0',
    description: 'REST API documentation for StockFlow Inventory Management System',
  },
  servers: [{ url: `http://localhost:${config.port}/api/v1` }],
  paths: {
    '/health': {
      get: { summary: 'System & Database Health Check', responses: { '200': { description: 'Healthy' } } },
    },
    '/auth/login': {
      post: { summary: 'User Login & Issue JWT', responses: { '200': { description: 'Authenticated' } } },
    },
    '/products': {
      get: { summary: 'List Products with pagination & filters', responses: { '200': { description: 'Products list' } } },
    },
    '/inventory/balances': {
      get: { summary: 'Multi-Warehouse Stock Balances', responses: { '200': { description: 'Stock matrix' } } },
    },
  },
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount REST API v1
const apiV1 = express.Router();

apiV1.use('/auth', authRouter);
apiV1.use('/users', usersRouter);
apiV1.use('/roles', rolesRouter);
apiV1.use('/products', productsRouter);
apiV1.use('/categories', categoriesRouter);
apiV1.use('/brands', brandsRouter);
apiV1.use('/warehouses', warehousesRouter);
apiV1.use('/suppliers', suppliersRouter);
apiV1.use('/customers', customersRouter);
apiV1.use('/inventory', inventoryRouter);
apiV1.use('/purchase-orders', purchasesRouter);
apiV1.use('/sales-orders', salesRouter);
apiV1.use('/dashboard', dashboardRouter);
apiV1.use('/reports', reportsRouter);
apiV1.use('/notifications', notificationsRouter);
apiV1.use('/settings', settingsRouter);
apiV1.use('/audit-logs', auditRouter);

app.use('/api/v1', apiV1);

// 404 Handler
app.use((req: Request, res: Response) => {
  return ApiResponse.error(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
});

// Global Error Handler
app.use(errorHandler);
