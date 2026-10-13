import { PrismaClient, ProductStatus, PurchaseOrderStatus, SalesOrderStatus, PaymentStatus, StockMovementType, StockAdjustmentType, StockAdjustmentStatus, PaymentMethod, NotificationType } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting StockFlow database seeding...');

  // 1. Business Settings
  const existingSettings = await prisma.businessSettings.findFirst();
  if (!existingSettings) {
    await prisma.businessSettings.create({
      data: {
        businessName: 'StockFlow Global Logistics & Supply',
        email: 'operations@stockflow.dev',
        phone: '+1 (800) 555-0199',
        address: '100 Enterprise Way, Suite 400',
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
        lowStockDefaultThreshold: 15.0,
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
  console.log('✅ Roles created');

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

    // Assign to SUPER_ADMIN and ADMIN
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roleMap['SUPER_ADMIN'], permissionId: perm.id } },
      update: {},
      create: { roleId: roleMap['SUPER_ADMIN'], permissionId: perm.id },
    });

    if (p.module !== 'settings' && p.module !== 'audit') {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap['ADMIN'], permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap['ADMIN'], permissionId: perm.id },
      });
    }

    if (['products:read', 'inventory:read', 'inventory:adjust', 'inventory:transfer', 'purchases:read', 'purchases:write', 'purchases:approve', 'purchases:receive', 'sales:read', 'sales:write', 'sales:fulfill', 'reports:read'].includes(p.code)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap['MANAGER'], permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap['MANAGER'], permissionId: perm.id },
      });
    }

    if (['products:read', 'inventory:read', 'inventory:transfer', 'purchases:read', 'purchases:receive', 'sales:read', 'sales:fulfill'].includes(p.code)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap['STAFF'], permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap['STAFF'], permissionId: perm.id },
      });
    }

    if (['products:read', 'inventory:read', 'reports:read'].includes(p.code)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleMap['VIEWER'], permissionId: perm.id } },
        update: {},
        create: { roleId: roleMap['VIEWER'], permissionId: perm.id },
      });
    }
  }
  console.log('✅ Permissions matrix established');

  // 3. Demo Users
  const defaultPassword = await argon2.hash('Admin@12345');
  const demoUsers = [
    { email: 'superadmin@stockflow.dev', firstName: 'Alexander', lastName: 'Vance', roleCode: 'SUPER_ADMIN' },
    { email: 'admin@stockflow.dev', firstName: 'Sarah', lastName: 'Jenkins', roleCode: 'ADMIN' },
    { email: 'manager@stockflow.dev', firstName: 'Marcus', lastName: 'Brody', roleCode: 'MANAGER' },
    { email: 'staff@stockflow.dev', firstName: 'Elena', lastName: 'Rostova', roleCode: 'STAFF' },
    { email: 'viewer@stockflow.dev', firstName: 'David', lastName: 'Kim', roleCode: 'VIEWER' },
  ];

  const userMap: Record<string, string> = {};
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, passwordHash: defaultPassword, isActive: true },
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: defaultPassword,
        isActive: true,
      },
    });
    userMap[u.roleCode] = user.id;

    // Link Role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleMap[u.roleCode] } },
      update: {},
      create: { userId: user.id, roleId: roleMap[u.roleCode] },
    });
  }
  console.log('✅ Demo Users created with secure Argon2 credentials');

  // 4. Warehouses
  const warehousesData = [
    { code: 'WH-MAIN', name: 'Chicago Central Logistics Center', address: '4400 S Pulaski Rd', city: 'Chicago', state: 'IL', contactName: 'Frank Miller', email: 'chicago@stockflow.dev', phone: '+1 312-555-0110', isDefault: true },
    { code: 'WH-WEST', name: 'Los Angeles Port Fulfillment', address: '2200 E Pacific Coast Hwy', city: 'Long Beach', state: 'CA', contactName: 'Jessica Morales', email: 'la@stockflow.dev', phone: '+1 310-555-0145', isDefault: false },
    { code: 'WH-EAST', name: 'Newark Metro Distribution', address: '120 Foundry St', city: 'Newark', state: 'NJ', contactName: 'Arthur Pendelton', email: 'newark@stockflow.dev', phone: '+1 973-555-0182', isDefault: false },
  ];

  const warehouseMap: Record<string, string> = {};
  for (const w of warehousesData) {
    const wh = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: w,
      create: w,
    });
    warehouseMap[w.code] = wh.id;
  }
  console.log('✅ Warehouses initialized');

  // 5. Categories & Brands
  const parentCat = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics', description: 'Consumer & enterprise electronics' },
  });

  const categoriesData = [
    { name: 'Laptops & Computers', slug: 'laptops-computers', parentId: parentCat.id },
    { name: 'Smartphones & Tablets', slug: 'smartphones-tablets', parentId: parentCat.id },
    { name: 'Audio & Peripherals', slug: 'audio-peripherals', parentId: parentCat.id },
    { name: 'Industrial Tools', slug: 'industrial-tools' },
    { name: 'Office Ergonomics', slug: 'office-ergonomics' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    categoryMap[c.slug] = cat.id;
  }

  const brandsData = [
    { name: 'Dell Technologies', slug: 'dell', description: 'Enterprise computing & monitors' },
    { name: 'Apple Inc.', slug: 'apple', description: 'Premium computers & mobile hardware' },
    { name: 'Sony Corporation', slug: 'sony', description: 'Studio grade audio & imaging' },
    { name: 'Logitech', slug: 'logitech', description: 'High-precision office peripherals' },
    { name: 'Samsung Electronics', slug: 'samsung', description: 'Display technology & tablets' },
    { name: 'Milwaukee Tool', slug: 'milwaukee', description: 'Heavy duty power tools' },
  ];

  const brandMap: Record<string, string> = {};
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
    brandMap[b.slug] = brand.id;
  }
  console.log('✅ Categories and Brands populated');

  // 6. Suppliers & Customers
  const suppliersData = [
    { code: 'SUP-001', companyName: 'Apex Micro Supplies Inc.', contactPerson: 'Michael Chang', email: 'mchang@apexmicro.com', phone: '+1 408-555-8812', taxId: 'US-948192831' },
    { code: 'SUP-002', companyName: 'Pacific Component Group', contactPerson: 'Linda Takahashi', email: 'linda@pacificcomp.com', phone: '+1 415-555-7723', taxId: 'US-827361922' },
    { code: 'SUP-003', companyName: 'Midwest Industrial Tooling', contactPerson: 'Robert Hayes', email: 'rhayes@midwesttool.com', phone: '+1 612-555-3341', taxId: 'US-738291044' },
  ];

  const supplierMap: Record<string, string> = {};
  for (const s of suppliersData) {
    const sup = await prisma.supplier.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
    supplierMap[s.code] = sup.id;
  }

  const customersData = [
    { code: 'CUST-001', name: 'Acme Enterprise Solutions', email: 'procurement@acme.com', phone: '+1 212-555-0988', company: 'Acme Corp', creditLimit: 50000.00, outstandingBalance: 4200.00 },
    { code: 'CUST-002', name: 'Nexus Retail Partners', email: 'orders@nexusretail.com', phone: '+1 312-555-7711', company: 'Nexus LLC', creditLimit: 25000.00, outstandingBalance: 1850.00 },
    { code: 'CUST-003', name: 'Quantum Design Studios', email: 'finance@quantumstudios.io', phone: '+1 206-555-4422', company: 'Quantum LLC', creditLimit: 30000.00, outstandingBalance: 0.00 },
  ];

  const customerMap: Record<string, string> = {};
  for (const c of customersData) {
    const cust = await prisma.customer.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
    customerMap[c.code] = cust.id;
  }
  console.log('✅ Suppliers and Customers ready');

  // 7. Products and Initial Inventory Movements
  const productsData = [
    {
      sku: 'DELL-XPS-15',
      name: 'Dell XPS 15 9530 Core i7 32GB 1TB SSD',
      barcode: '884116410291',
      description: '15.6-inch OLED 3.5K touch display, Intel Core i7-13700H, NVIDIA RTX 4060.',
      categoryId: categoryMap['laptops-computers'],
      brandId: brandMap['dell'],
      unit: 'pcs',
      costPrice: 1350.00,
      sellingPrice: 1999.00,
      taxRate: 8.25,
      reorderLevel: 10,
      status: ProductStatus.ACTIVE,
      initialStocks: [
        { warehouseCode: 'WH-MAIN', qty: 45 },
        { warehouseCode: 'WH-WEST', qty: 20 },
        { warehouseCode: 'WH-EAST', qty: 15 },
      ],
    },
    {
      sku: 'AAPL-MBP-16',
      name: 'Apple MacBook Pro 16" M3 Pro 36GB 512GB',
      barcode: '195949021940',
      description: 'Liquid Retina XDR display, 12-core CPU, 18-core GPU, Space Black finish.',
      categoryId: categoryMap['laptops-computers'],
      brandId: brandMap['apple'],
      unit: 'pcs',
      costPrice: 1950.00,
      sellingPrice: 2499.00,
      taxRate: 8.25,
      reorderLevel: 8,
      status: ProductStatus.ACTIVE,
      initialStocks: [
        { warehouseCode: 'WH-MAIN', qty: 25 },
        { warehouseCode: 'WH-WEST', qty: 12 },
        { warehouseCode: 'WH-EAST', qty: 8 },
      ],
    },
    {
      sku: 'SONY-WH-XM5',
      name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      barcode: '027242923980',
      description: 'Industry-leading noise cancellation, 30-hour battery life, Multipoint connection.',
      categoryId: categoryMap['audio-peripherals'],
      brandId: brandMap['sony'],
      unit: 'pcs',
      costPrice: 240.00,
      sellingPrice: 399.99,
      taxRate: 8.25,
      reorderLevel: 25,
      status: ProductStatus.ACTIVE,
      initialStocks: [
        { warehouseCode: 'WH-MAIN', qty: 80 },
        { warehouseCode: 'WH-WEST', qty: 40 },
        { warehouseCode: 'WH-EAST', qty: 30 },
      ],
    },
    {
      sku: 'LOGI-MX-3S',
      name: 'Logitech MX Master 3S Wireless Performance Mouse',
      barcode: '097855174412',
      description: '8K DPI optical sensor, quiet clicks, MagSpeed electromagnetic scrolling.',
      categoryId: categoryMap['audio-peripherals'],
      brandId: brandMap['logitech'],
      unit: 'pcs',
      costPrice: 58.00,
      sellingPrice: 99.99,
      taxRate: 8.25,
      reorderLevel: 30,
      status: ProductStatus.ACTIVE,
      initialStocks: [
        { warehouseCode: 'WH-MAIN', qty: 120 },
        { warehouseCode: 'WH-WEST', qty: 60 },
        { warehouseCode: 'WH-EAST', qty: 45 },
      ],
    },
    {
      sku: 'SAMS-TAB-S9',
      name: 'Samsung Galaxy Tab S9 Ultra 256GB 5G',
      barcode: '887276771021',
      description: '14.6" Dynamic AMOLED 2X, S Pen included, Snapdragon 8 Gen 2 processor.',
      categoryId: categoryMap['smartphones-tablets'],
      brandId: brandMap['samsung'],
      unit: 'pcs',
      costPrice: 720.00,
      sellingPrice: 1199.99,
      taxRate: 8.25,
      reorderLevel: 12,
      status: ProductStatus.ACTIVE,
      initialStocks: [
        { warehouseCode: 'WH-MAIN', qty: 18 },
        { warehouseCode: 'WH-WEST', qty: 8 },
        { warehouseCode: 'WH-EAST', qty: 5 }, // Low stock!
      ],
    },
    {
      sku: 'MILW-M18-DRL',
      name: 'Milwaukee M18 FUEL 1/2" Hammer Drill/Driver Kit',
      barcode: '045242589332',
      description: 'Brushless motor delivers up to 1,400 in-lbs torque. Includes two 5.0Ah batteries.',
      categoryId: categoryMap['industrial-tools'],
      brandId: brandMap['milwaukee'],
      unit: 'pcs',
      costPrice: 175.00,
      sellingPrice: 299.00,
      taxRate: 8.25,
      reorderLevel: 15,
      status: ProductStatus.ACTIVE,
      initialStocks: [
        { warehouseCode: 'WH-MAIN', qty: 50 },
        { warehouseCode: 'WH-WEST', qty: 20 },
        { warehouseCode: 'WH-EAST', qty: 18 },
      ],
    },
    {
      sku: 'OFF-CHR-ERG',
      name: 'Ergonomic Executive Mesh Task Chair Pro',
      barcode: '719284019284',
      description: 'Dynamic lumbar support, 4D adjustable armrests, breathable high-tensile mesh.',
      categoryId: categoryMap['office-ergonomics'],
      brandId: null,
      unit: 'pcs',
      costPrice: 140.00,
      sellingPrice: 289.00,
      taxRate: 8.25,
      reorderLevel: 20,
      status: ProductStatus.ACTIVE,
      initialStocks: [
        { warehouseCode: 'WH-MAIN', qty: 6 }, // Trigger low stock alert!
        { warehouseCode: 'WH-WEST', qty: 4 },
        { warehouseCode: 'WH-EAST', qty: 2 },
      ],
    },
  ];

  const adminUserId = userMap['ADMIN'];

  for (const item of productsData) {
    const { initialStocks, ...productInput } = item;
    const product = await prisma.product.upsert({
      where: { sku: productInput.sku },
      update: productInput,
      create: productInput,
    });

    // Populate StockBalances and immutable StockMovement transactions
    for (const stock of initialStocks) {
      const wId = warehouseMap[stock.warehouseCode];
      
      const balance = await prisma.stockBalance.upsert({
        where: {
          warehouseId_productId_productVariantId: {
            warehouseId: wId,
            productId: product.id,
            productVariantId: '00000000-0000-0000-0000-000000000000', // standard non-variant placeholder or null handling
          },
        },
        update: {
          quantityOnHand: stock.qty,
          availableQuantity: stock.qty,
        },
        create: {
          warehouseId: wId,
          productId: product.id,
          quantityOnHand: stock.qty,
          availableQuantity: stock.qty,
          allocatedQuantity: 0,
        },
      }).catch(async () => {
        // Fallback for null unique constraint behavior
        const existing = await prisma.stockBalance.findFirst({
          where: { warehouseId: wId, productId: product.id, productVariantId: null },
        });
        if (existing) {
          return prisma.stockBalance.update({
            where: { id: existing.id },
            data: { quantityOnHand: stock.qty, availableQuantity: stock.qty },
          });
        }
        return prisma.stockBalance.create({
          data: {
            warehouseId: wId,
            productId: product.id,
            quantityOnHand: stock.qty,
            availableQuantity: stock.qty,
            allocatedQuantity: 0,
          },
        });
      });

      // Immutable Stock Movement entry (Documented opening balance)
      const existingMovement = await prisma.stockMovement.findFirst({
        where: {
          warehouseId: wId,
          productId: product.id,
          referenceType: 'OPENING_BALANCE',
        },
      });

      if (!existingMovement) {
        await prisma.stockMovement.create({
          data: {
            warehouseId: wId,
            productId: product.id,
            type: StockMovementType.INITIAL_STOCK,
            quantity: stock.qty,
            unitCost: product.costPrice,
            balanceAfter: stock.qty,
            referenceType: 'OPENING_BALANCE',
            referenceId: 'SEED-INIT-001',
            reason: 'Opening Balance Inventory Intake',
            userId: adminUserId,
          },
        });
      }
    }
  }
  console.log('✅ Products & Transaction-backed Inventory Ledgers created');

  // 8. Sample Purchase Order & Goods Receipt
  const mainWarehouseId = warehouseMap['WH-MAIN'];
  const supApexId = supplierMap['SUP-001'];
  const dellProduct = await prisma.product.findUnique({ where: { sku: 'DELL-XPS-15' } });
  const logiProduct = await prisma.product.findUnique({ where: { sku: 'LOGI-MX-3S' } });

  if (dellProduct && logiProduct) {
    const poNumber = 'PO-2026-0001';
    let po = await prisma.purchaseOrder.findUnique({ where: { orderNumber: poNumber } });
    if (!po) {
      po = await prisma.purchaseOrder.create({
        data: {
          orderNumber: poNumber,
          supplierId: supApexId,
          warehouseId: mainWarehouseId,
          status: PurchaseOrderStatus.RECEIVED,
          subtotal: 13500.00,
          taxAmount: 1113.75,
          discountAmount: 0.00,
          grandTotal: 14613.75,
          createdById: userMap['MANAGER'],
          approvedById: userMap['ADMIN'],
          orderedAt: new Date(Date.now() - 14 * 86400000),
          approvedAt: new Date(Date.now() - 13 * 86400000),
          expectedAt: new Date(Date.now() - 7 * 86400000),
          notes: 'Standard replenishment batch for Q4 commercial accounts.',
          items: {
            create: [
              {
                productId: dellProduct.id,
                orderedQuantity: 10,
                receivedQuantity: 10,
                unitCost: 1350.00,
                subtotal: 13500.00,
                taxRate: 8.25,
                taxAmount: 1113.75,
                total: 14613.75,
              },
            ],
          },
        },
      });

      // Goods Receipt
      await prisma.goodsReceipt.create({
        data: {
          receiptNumber: 'GR-2026-0001',
          purchaseOrderId: po.id,
          warehouseId: mainWarehouseId,
          receivedDate: new Date(Date.now() - 7 * 86400000),
          receivedById: userMap['STAFF'],
          notes: 'Inspected and accepted with zero defects.',
          items: {
            create: [
              {
                productId: dellProduct.id,
                receivedQuantity: 10,
                unitCost: 1350.00,
              },
            ],
          },
        },
      });
      console.log('✅ Sample Purchase Order & Goods Receipt seeded');
    }
  }

  // 9. Sample Sales Order, Invoice & Payment
  const acmeCustomerId = customerMap['CUST-001'];
  if (dellProduct && logiProduct) {
    const soNumber = 'SO-2026-0001';
    let so = await prisma.salesOrder.findUnique({ where: { orderNumber: soNumber } });
    if (!so) {
      so = await prisma.salesOrder.create({
        data: {
          orderNumber: soNumber,
          customerId: acmeCustomerId,
          warehouseId: mainWarehouseId,
          status: SalesOrderStatus.FULFILLED,
          paymentStatus: PaymentStatus.PAID,
          subtotal: 6197.97,
          taxAmount: 511.33,
          discountAmount: 100.00,
          grandTotal: 6609.30,
          paidAmount: 6609.30,
          createdById: userMap['STAFF'],
          fulfilledAt: new Date(Date.now() - 3 * 86400000),
          notes: 'Priority corporate order for Acme IT expansion.',
          items: {
            create: [
              {
                productId: dellProduct.id,
                orderedQuantity: 3,
                fulfilledQuantity: 3,
                unitPrice: 1999.00,
                subtotal: 5997.00,
                taxRate: 8.25,
                taxAmount: 494.75,
                total: 6491.75,
              },
              {
                productId: logiProduct.id,
                orderedQuantity: 2,
                fulfilledQuantity: 2,
                unitPrice: 99.99,
                subtotal: 199.98,
                taxRate: 8.25,
                taxAmount: 16.50,
                total: 216.48,
              },
            ],
          },
        },
      });

      // Invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-0001',
          salesOrderId: so.id,
          issueDate: new Date(Date.now() - 3 * 86400000),
          dueDate: new Date(Date.now() + 27 * 86400000),
          subtotal: 6197.97,
          taxAmount: 511.33,
          grandTotal: 6609.30,
          paidAmount: 6609.30,
          status: PaymentStatus.PAID,
          notes: 'Paid via Corporate Wire Transfer',
        },
      });

      // Payment
      await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-2026-0001',
          invoiceId: invoice.id,
          customerId: acmeCustomerId,
          amount: 6609.30,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          referenceNumber: 'WIRE-9928174',
          paymentDate: new Date(Date.now() - 2 * 86400000),
          notes: 'Full settlement received into Wells Fargo clearing account.',
        },
      });
      console.log('✅ Sample Sales Order, Invoice & Payment seeded');
    }
  }

  // 10. Notifications
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.LOW_STOCK,
        title: 'Low Stock Alert: Ergonomic Executive Task Chair Pro',
        message: 'Current balance (6 pcs) is below the configured reorder threshold (20 pcs) in Chicago Central Logistics.',
        linkUrl: '/inventory',
      },
      {
        type: NotificationType.LOW_STOCK,
        title: 'Critical Stock: Samsung Galaxy Tab S9 Ultra in Newark',
        message: 'Newark Metro Distribution holds only 5 units remaining.',
        linkUrl: '/inventory',
      },
      {
        type: NotificationType.PURCHASE_APPROVAL,
        title: 'Pending Purchase Approval: PO-2026-0002',
        message: 'Procurement order for Pacific Component Group awaiting manager sign-off.',
        linkUrl: '/purchases',
      },
    ],
    skipDuplicates: true,
  });

  // 11. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: userMap['SUPER_ADMIN'],
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'ENTERPRISE_SYSTEM',
      entityId: 'SYSTEM-ROOT',
      details: JSON.stringify({ message: 'StockFlow Production Seed executed successfully' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
