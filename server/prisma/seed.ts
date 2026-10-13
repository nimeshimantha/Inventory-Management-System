import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting StockFlow system initialization (Essential System Data Only)...');

  // 1. Business Settings (Core configuration defaults)
  const existingSettings = await prisma.businessSettings.findFirst();
  if (!existingSettings) {
    await prisma.businessSettings.create({
      data: {
        businessName: 'StockFlow Enterprise',
        email: 'admin@stockflow.dev',
        phone: '+1 (800) 555-0100',
        address: '100 Enterprise Boulevard',
        city: 'Chicago, IL',
        country: 'United States',
        currencyCode: 'USD',
        currencySymbol: '$',
        timezone: 'America/Chicago',
        taxRateDefault: 8.25,
        invoicePrefix: 'INV-',
        purchaseOrderPrefix: 'PO-',
        salesOrderPrefix: 'SO-',
        transferPrefix: 'TR-',
        adjustmentPrefix: 'ADJ-',
        lowStockDefaultThreshold: 10.0,
        allowNegativeStock: false,
        costingMethod: 'WEIGHTED_AVERAGE',
      },
    });
    console.log('✅ Business Settings initialized');
  }

  // 2. Roles & Permissions Matrix
  const rolesData = [
    { name: 'Super Administrator', code: 'SUPER_ADMIN', description: 'Unrestricted enterprise control', isSystem: true },
    { name: 'Operations Administrator', code: 'ADMIN', description: 'Business operations, users, and setup', isSystem: true },
    { name: 'Inventory Manager', code: 'MANAGER', description: 'Inventory adjustments, approvals, and reports', isSystem: true },
    { name: 'Warehouse Staff', code: 'STAFF', description: 'Stock intake, fulfillment, and transfers', isSystem: true },
    { name: 'Read-only Viewer', code: 'VIEWER', description: 'Read-only visibility for dashboards & reports', isSystem: true },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    });
    roleMap[r.code] = role.id;
  }
  console.log('✅ System Roles established');

  const permissionsList = [
    // Auth & Users
    { code: 'users:read', name: 'View Users', module: 'users', action: 'read' },
    { code: 'users:write', name: 'Create/Edit Users', module: 'users', action: 'write' },
    { code: 'users:delete', name: 'Delete/Deactivate Users', module: 'users', action: 'delete' },
    // Products
    { code: 'products:read', name: 'View Products', module: 'products', action: 'read' },
    { code: 'products:write', name: 'Create/Edit Products', module: 'products', action: 'write' },
    { code: 'products:delete', name: 'Delete/Archive Products', module: 'products', action: 'delete' },
    // Inventory
    { code: 'inventory:read', name: 'View Inventory', module: 'inventory', action: 'read' },
    { code: 'inventory:adjust', name: 'Perform Stock Adjustments', module: 'inventory', action: 'adjust' },
    { code: 'inventory:transfer', name: 'Manage Warehouse Transfers', module: 'inventory', action: 'transfer' },
    // Purchases
    { code: 'purchases:read', name: 'View Purchase Orders', module: 'purchases', action: 'read' },
    { code: 'purchases:write', name: 'Create/Edit Purchase Orders', module: 'purchases', action: 'write' },
    { code: 'purchases:approve', name: 'Approve Purchase Orders', module: 'purchases', action: 'approve' },
    { code: 'purchases:receive', name: 'Receive Goods Intake', module: 'purchases', action: 'receive' },
    // Sales
    { code: 'sales:read', name: 'View Sales Orders', module: 'sales', action: 'read' },
    { code: 'sales:write', name: 'Create/Edit Sales Orders', module: 'sales', action: 'write' },
    { code: 'sales:fulfill', name: 'Fulfill Sales Orders', module: 'sales', action: 'fulfill' },
    // Reports & Audit
    { code: 'reports:read', name: 'View Business Analytics', module: 'reports', action: 'read' },
    { code: 'audit:read', name: 'View Audit Logs', module: 'audit', action: 'read' },
    { code: 'settings:write', name: 'Modify System Settings', module: 'settings', action: 'write' },
  ];

  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module, action: p.action },
      create: p,
    });

    // Assign to SUPER_ADMIN
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roleMap['SUPER_ADMIN'], permissionId: perm.id } },
      update: {},
      create: { roleId: roleMap['SUPER_ADMIN'], permissionId: perm.id },
    });

    // Assign to ADMIN
    if (p.module !== 'settings' && p.module !== 'audit') {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap['ADMIN'], permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap['ADMIN'], permissionId: perm.id },
      });
    }

    // Assign to MANAGER
    if (['products:read', 'inventory:read', 'inventory:adjust', 'inventory:transfer', 'purchases:read', 'purchases:write', 'purchases:approve', 'purchases:receive', 'sales:read', 'sales:write', 'sales:fulfill', 'reports:read'].includes(p.code)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap['MANAGER'], permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap['MANAGER'], permissionId: perm.id },
      });
    }

    // Assign to STAFF
    if (['products:read', 'inventory:read', 'inventory:transfer', 'purchases:read', 'purchases:receive', 'sales:read', 'sales:fulfill'].includes(p.code)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap['STAFF'], permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap['STAFF'], permissionId: perm.id },
      });
    }

    // Assign to VIEWER
    if (['products:read', 'inventory:read', 'reports:read'].includes(p.code)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap['VIEWER'], permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap['VIEWER'], permissionId: perm.id },
      });
    }
  }
  console.log('✅ Permissions matrix established');

  // 3. System Administrator Account
  const defaultPassword = await argon2.hash('Admin@12345');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@stockflow.dev' },
    update: { isActive: true },
    create: {
      email: 'admin@stockflow.dev',
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: defaultPassword,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roleMap['SUPER_ADMIN'] } },
    update: {},
    create: { userId: adminUser.id, roleId: roleMap['SUPER_ADMIN'] },
  });

  console.log('✅ Initial Administrator account configured (admin@stockflow.dev)');

  // 4. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'ENTERPRISE_SYSTEM',
      entityId: 'SYSTEM-ROOT',
      details: JSON.stringify({ message: 'StockFlow system initialized with core roles and security settings' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🎉 System initialization successfully finished! (Zero demo business records created)');
}

main()
  .catch((e) => {
    console.error('❌ System initialization failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
