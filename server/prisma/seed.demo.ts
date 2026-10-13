import { PrismaClient, ProductStatus, PurchaseOrderStatus, SalesOrderStatus, PaymentStatus, StockMovementType, PaymentMethod, NotificationType } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting optional demo business data seeding...');

  // Ensure Roles & Warehouses
  const roles = await prisma.role.findMany();
  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    roleMap[r.code] = r.id;
  }

  // Ensure Admin User
  let admin = await prisma.user.findFirst({ where: { email: 'admin@stockflow.dev' } });
  if (!admin) {
    const passwordHash = await argon2.hash('Admin@12345');
    admin = await prisma.user.create({
      data: {
        email: 'admin@stockflow.dev',
        firstName: 'System',
        lastName: 'Admin',
        passwordHash,
        isActive: true,
      },
    });
    const adminRole = roleMap['ADMIN'] || (await prisma.role.findFirst({ where: { code: 'ADMIN' } }))?.id;
    if (adminRole) {
      await prisma.userRole.create({
        data: { userId: admin.id, roleId: adminRole },
      });
    }
  }

  // Warehouses
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
  console.log('✅ Demo Warehouses initialized');

  // Categories & Brands
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
  console.log('✅ Demo Categories and Brands populated');

  // Suppliers & Customers
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
  console.log('✅ Demo Suppliers and Customers ready');

  // Products and Initial Inventory Movements
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
        { warehouseCode: 'WH-EAST', qty: 5 },
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
        { warehouseCode: 'WH-MAIN', qty: 6 },
        { warehouseCode: 'WH-WEST', qty: 4 },
        { warehouseCode: 'WH-EAST', qty: 2 },
      ],
    },
  ];

  for (const item of productsData) {
    const { initialStocks, ...productInput } = item;
    const product = await prisma.product.upsert({
      where: { sku: productInput.sku },
      update: productInput,
      create: productInput,
    });

    for (const stock of initialStocks) {
      const wId = warehouseMap[stock.warehouseCode];
      const existing = await prisma.stockBalance.findFirst({
        where: { warehouseId: wId, productId: product.id, productVariantId: null },
      });
      if (existing) {
        await prisma.stockBalance.update({
          where: { id: existing.id },
          data: { quantityOnHand: stock.qty, availableQuantity: stock.qty },
        });
      } else {
        await prisma.stockBalance.create({
          data: {
            warehouseId: wId,
            productId: product.id,
            quantityOnHand: stock.qty,
            availableQuantity: stock.qty,
            allocatedQuantity: 0,
          },
        });
      }

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
            userId: admin.id,
          },
        });
      }
    }
  }
  console.log('✅ Demo Products & Inventory Ledgers created');

  console.log('🎉 Demo business data seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Demo seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
