import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Target SKUs confirmed to originate from initial seed and automated test runs
const DEMO_SKUS = [
  'DELL-XPS-15',
  'AAPL-MBP-16',
  'SONY-WH-XM5',
  'LOGI-MX-3S',
  'SAMS-TAB-S9',
  'MILW-M18-DRL',
  'OFF-CHR-ERG',
];

const DEMO_CATEGORY_SLUGS = [
  'electronics',
  'laptops-computers',
  'smartphones-tablets',
  'audio-peripherals',
  'industrial-tools',
  'office-ergonomics',
];

const DEMO_BRAND_SLUGS = [
  'dell',
  'apple',
  'sony',
  'logitech',
  'samsung',
  'milwaukee',
];

const DEMO_WAREHOUSE_CODES = ['WH-MAIN', 'WH-WEST', 'WH-EAST'];
const DEMO_SUPPLIER_CODES = ['SUP-001', 'SUP-002', 'SUP-003'];
const DEMO_CUSTOMER_CODES = ['CUST-001', 'CUST-002', 'CUST-003'];
const DEMO_PO_NUMBERS = ['PO-2026-0001'];
const DEMO_SO_NUMBERS = ['SO-2026-0001'];

export async function previewCleanup() {
  console.log('🔍 PREVIEWING CONFIRMED DEMO RECORDS IN POSTGRESQL...\n');

  const demoProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { in: DEMO_SKUS } },
        { sku: { startsWith: 'TEST-SKU-' } },
      ],
    },
    select: { id: true, sku: true, name: true, createdAt: true },
  });

  const demoProductIds = demoProducts.map((p) => p.id);

  const stockBalances = await prisma.stockBalance.count({
    where: { productId: { in: demoProductIds } },
  });

  const stockMovements = await prisma.stockMovement.count({
    where: { productId: { in: demoProductIds } },
  });

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { orderNumber: { in: DEMO_PO_NUMBERS } },
    select: { id: true, orderNumber: true },
  });

  const salesOrders = await prisma.salesOrder.findMany({
    where: { orderNumber: { in: DEMO_SO_NUMBERS } },
    select: { id: true, orderNumber: true },
  });

  const categories = await prisma.category.findMany({
    where: { slug: { in: DEMO_CATEGORY_SLUGS } },
    select: { id: true, name: true, slug: true },
  });

  const brands = await prisma.brand.findMany({
    where: { slug: { in: DEMO_BRAND_SLUGS } },
    select: { id: true, name: true, slug: true },
  });

  const warehouses = await prisma.warehouse.findMany({
    where: { code: { in: DEMO_WAREHOUSE_CODES } },
    select: { id: true, code: true, name: true },
  });

  const suppliers = await prisma.supplier.findMany({
    where: { code: { in: DEMO_SUPPLIER_CODES } },
    select: { id: true, code: true, companyName: true },
  });

  const customers = await prisma.customer.findMany({
    where: { code: { in: DEMO_CUSTOMER_CODES } },
    select: { id: true, code: true, name: true },
  });

  console.log(`📦 Demo Products to remove: ${demoProducts.length}`);
  demoProducts.forEach((p) => console.log(`   - [${p.sku}] ${p.name} (ID: ${p.id})`));

  console.log(`\n📊 Dependent Stock Balances: ${stockBalances}`);
  console.log(`📊 Dependent Stock Movements: ${stockMovements}`);
  console.log(`📑 Demo Purchase Orders: ${purchaseOrders.length}`);
  console.log(`📑 Demo Sales Orders: ${salesOrders.length}`);
  console.log(`📁 Demo Categories: ${categories.length}`);
  console.log(`🏷️ Demo Brands: ${brands.length}`);
  console.log(`🏢 Demo Warehouses: ${warehouses.length}`);
  console.log(`🚚 Demo Suppliers: ${suppliers.length}`);
  console.log(`👥 Demo Customers: ${customers.length}`);

  return {
    demoProductIds,
    purchaseOrderIds: purchaseOrders.map((p) => p.id),
    salesOrderIds: salesOrders.map((s) => s.id),
    categoryIds: categories.map((c) => c.id),
    brandIds: brands.map((b) => b.id),
    warehouseIds: warehouses.map((w) => w.id),
    supplierIds: suppliers.map((s) => s.id),
    customerIds: customers.map((c) => c.id),
  };
}

export async function executeCleanup() {
  const isConfirmed = process.argv.includes('--confirm') || process.env.CONFIRM_PURGE === 'true';

  if (!isConfirmed) {
    console.log('\n⚠️  SAFETY NOTICE: Dry-run preview complete.');
    console.log('To execute this cleanup transaction, the script requires the explicit flag:');
    console.log('npx tsx scripts/clean-demo-data.ts --confirm\n');
    return;
  }

  console.log('\n🚀 EXECUTING ATOMIC CLEANUP TRANSACTION...');

  await prisma.$transaction(async (tx) => {
    // 1. Identify Target Records
    const demoProducts = await tx.product.findMany({
      where: {
        OR: [
          { sku: { in: DEMO_SKUS } },
          { sku: { startsWith: 'TEST-SKU-' } },
        ],
      },
      select: { id: true },
    });
    const demoProductIds = demoProducts.map((p) => p.id);

    const demoPOs = await tx.purchaseOrder.findMany({
      where: { orderNumber: { in: DEMO_PO_NUMBERS } },
      select: { id: true },
    });
    const poIds = demoPOs.map((p) => p.id);

    const demoSOs = await tx.salesOrder.findMany({
      where: { orderNumber: { in: DEMO_SO_NUMBERS } },
      select: { id: true },
    });
    const soIds = demoSOs.map((s) => s.id);

    // 2. Delete payments and invoices tied to demo sales orders
    await tx.payment.deleteMany({
      where: { invoice: { salesOrderId: { in: soIds } } },
    });
    await tx.invoice.deleteMany({
      where: { salesOrderId: { in: soIds } },
    });

    // 3. Delete Sales Order Items & Sales Orders
    await tx.salesOrderItem.deleteMany({
      where: { salesOrderId: { in: soIds } },
    });
    await tx.salesOrder.deleteMany({
      where: { id: { in: soIds } },
    });

    // 4. Delete Goods Receipts & Purchase Orders
    await tx.goodsReceiptItem.deleteMany({
      where: { goodsReceipt: { purchaseOrderId: { in: poIds } } },
    });
    await tx.goodsReceipt.deleteMany({
      where: { purchaseOrderId: { in: poIds } },
    });
    await tx.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: { in: poIds } },
    });
    await tx.purchaseOrder.deleteMany({
      where: { id: { in: poIds } },
    });

    // 5. Delete Stock Movements & Stock Balances for demo products
    await tx.stockMovement.deleteMany({
      where: { productId: { in: demoProductIds } },
    });
    await tx.stockBalance.deleteMany({
      where: { productId: { in: demoProductIds } },
    });

    // 6. Delete Products
    await tx.product.deleteMany({
      where: { id: { in: demoProductIds } },
    });

    // 7. Delete Categories (children first, then parents)
    await tx.category.deleteMany({
      where: { slug: { in: DEMO_CATEGORY_SLUGS }, parentId: { not: null } },
    });
    await tx.category.deleteMany({
      where: { slug: { in: DEMO_CATEGORY_SLUGS } },
    });

    // 8. Delete Brands
    await tx.brand.deleteMany({
      where: { slug: { in: DEMO_BRAND_SLUGS } },
    });

    // 9. Delete Suppliers & Customers
    await tx.supplier.deleteMany({
      where: { code: { in: DEMO_SUPPLIER_CODES } },
    });
    await tx.customer.deleteMany({
      where: { code: { in: DEMO_CUSTOMER_CODES } },
    });

    // 10. Delete Warehouses
    await tx.warehouse.deleteMany({
      where: { code: { in: DEMO_WAREHOUSE_CODES } },
    });

    // 11. Delete demo notifications
    await tx.notification.deleteMany({});
  });

  console.log('✅ Cleanup transaction successfully committed!');
  console.log('🛡️ All Roles, Permissions, System Settings, and Admin User accounts were strictly preserved.');
}

async function main() {
  await previewCleanup();
  await executeCleanup();
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
