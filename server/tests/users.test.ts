import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { config } from '../src/config/index.js';

describe('User Management & Listing Test Suite', () => {
  let adminToken: string;
  let testUserId: string;
  const testEmail = `test-user-${Date.now()}@testflow.local`;

  beforeAll(async () => {
    // Login as system admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@stockflow.dev',
        password: 'Admin@12345',
      });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.accessToken;
  });

  it('TEST 1 & 2: POST /api/v1/users creates user in PostgreSQL and GET /api/v1/users returns array', async () => {
    const createRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: testEmail,
        password: 'Password@123',
        firstName: 'Automated',
        lastName: 'Tester',
        phone: '+1-555-0199',
        roleCodes: ['STAFF'],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.email).toBe(testEmail.toLowerCase());
    testUserId = createRes.body.data.id;

    // Verify GET /api/v1/users returns array in data
    const listRes = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.meta).toBeDefined();

    const found = listRes.body.data.find((u: { id: string }) => u.id === testUserId);
    expect(found).toBeDefined();
    expect(found.firstName).toBe('Automated');
    expect(found.lastName).toBe('Tester');
    expect(found.roles.some((r: { code?: string } | string) => (typeof r === 'string' ? r : r.code) === 'STAFF')).toBe(true);
  });

  it('TEST 4: GET /api/v1/users with search query returns matching user', async () => {
    const searchRes = await request(app)
      .get(`/api/v1/users?search=${encodeURIComponent(testEmail)}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(searchRes.status).toBe(200);
    expect(Array.isArray(searchRes.body.data)).toBe(true);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].email).toBe(testEmail.toLowerCase());
  });

  it('TEST 8: Unauthorized and forbidden users cannot access user management', async () => {
    // Unauthenticated request -> 401
    const unauthRes = await request(app).get('/api/v1/users');
    expect(unauthRes.status).toBe(401);

    // Request from STAFF user (not SUPER_ADMIN or ADMIN) -> 403 Forbidden
    const staffToken = jwt.sign(
      { userId: testUserId, email: testEmail.toLowerCase() },
      config.jwt.accessSecret,
      { expiresIn: '15m' }
    );

    const forbiddenRes = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(forbiddenRes.status).toBe(403);
  });

  it('TEST 9: POST /api/v1/users rejects duplicate email with 409 Conflict', async () => {
    const dupRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: testEmail,
        password: 'Password@123',
        firstName: 'Duplicate',
        lastName: 'Tester',
        roleCodes: ['STAFF'],
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  afterAll(async () => {
    // Clean up created test user immediately to preserve database hygiene
    if (testUserId) {
      await prisma.userRole.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { entityId: testUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });
});
