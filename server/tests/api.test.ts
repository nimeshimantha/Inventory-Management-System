import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('StockFlow Backend API Test Suite', () => {
  let authToken: string;

  describe('1. System Health & Infrastructure', () => {
    it('GET /health should return 200 with status UP and PostgreSQL CONNECTED', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.database).toBe('CONNECTED');
    });
  });

  describe('2. Authentication & Security Flow', () => {
    it('POST /api/v1/auth/login with valid credentials should return 200 and JWT access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@stockflow.dev',
          password: 'Admin@12345',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@stockflow.dev');
      expect(res.body.data.user.roles).toContain('ADMIN');

      authToken = res.body.data.accessToken;
    });

    it('POST /api/v1/auth/login with invalid password should return 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@stockflow.dev',
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/auth/me should return current user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@stockflow.dev');
      expect(res.body.data.roles).toContain('ADMIN');
    });

    it('GET /api/v1/auth/me without token should return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Product Management CRUD & Validation', () => {
    let createdProductId: string;
    const testSku = `TEST-SKU-${Date.now()}`;

    it('GET /api/v1/products should return seeded products list with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('POST /api/v1/products should create a new product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Vitest Industrial Sensor Pro',
          sku: testSku,
          barcode: `BAR-${Date.now()}`,
          unit: 'pcs',
          costPrice: 45.0,
          sellingPrice: 89.99,
          reorderLevel: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sku).toBe(testSku);
      createdProductId = res.body.data.id;
    });

    it('POST /api/v1/products with duplicate SKU should return 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Duplicate Sensor',
          sku: testSku,
          unit: 'pcs',
        });

      expect(res.status).toBe(409);
    });

    it('GET /api/v1/products/:id should retrieve details of the created product', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdProductId);
      expect(res.body.data.sku).toBe(testSku);
    });
  });

  describe('4. Inventory Engine & Stock Operations', () => {
    it('GET /api/v1/inventory/balances should return warehouse stock balances', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/balances')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].warehouseName).toBeDefined();
    });

    it('GET /api/v1/inventory/movements should return immutable stock movement ledger entries', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/movements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].type).toBeDefined();
    });
  });

  describe('5. Real-Time Dashboard Aggregations', () => {
    it('GET /api/v1/dashboard/metrics should return aggregated database metrics', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalProducts).toBeGreaterThan(0);
      expect(res.body.data.totalInventoryValue).toBeGreaterThan(0);
      expect(res.body.data.totalSales).toBeGreaterThan(0);
    });

    it('GET /api/v1/dashboard/revenue-trends should return historical data for charts', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/revenue-trends?days=7')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(8);
    });
  });

  describe('6. Reports & Valuation Calculation', () => {
    it('GET /api/v1/reports/valuation should return weighted average inventory valuation', async () => {
      const res = await request(app)
        .get('/api/v1/reports/valuation')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalUnits).toBeGreaterThan(0);
      expect(res.body.data.summary.totalCostValuation).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });
});
