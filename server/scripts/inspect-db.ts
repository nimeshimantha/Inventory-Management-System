import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDb() {
  const products = await prisma.product.findMany({
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      stockBalances: true,
      stockMovements: true,
      purchaseOrderItems: true,
      salesOrderItems: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true, _count: { select: { products: true } } },
  });

  const brands = await prisma.brand.findMany({
    select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
  });

  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, code: true, name: true },
  });

  const suppliers = await prisma.supplier.findMany({
    select: { id: true, code: true, companyName: true },
  });

  const customers = await prisma.customer.findMany({
    select: { id: true, code: true, name: true },
  });

  const poCount = await prisma.purchaseOrder.count();
  const soCount = await prisma.salesOrder.count();
  const grCount = await prisma.goodsReceipt.count();
  const invCount = await prisma.invoice.count();
  const payCount = await prisma.payment.count();
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  console.log('=== SUMMARY COUNTS ===');
  console.log('Products:', products.length);
  console.log('Categories:', categories.length);
  console.log('Brands:', brands.length);
  console.log('Warehouses:', warehouses.length);
  console.log('Suppliers:', suppliers.length);
  console.log('Customers:', customers.length);
  console.log('Purchase Orders:', poCount);
  console.log('Sales Orders:', soCount);
  console.log('Goods Receipts:', grCount);
  console.log('Invoices:', invCount);
  console.log('Payments:', payCount);
  console.log('Users:', users.length);

  console.log('\n=== PRODUCTS DETAILS ===');
  for (const p of products) {
    console.log(JSON.stringify({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name,
      brand: p.brand?.name,
      balancesCount: p.stockBalances.length,
      movementsCount: p.stockMovements.length,
      poItemsCount: p.purchaseOrderItems.length,
      soItemsCount: p.salesOrderItems.length,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  console.log('\n=== CATEGORIES DETAILS ===');
  console.log(JSON.stringify(categories, null, 2));

  console.log('\n=== BRANDS DETAILS ===');
  console.log(JSON.stringify(brands, null, 2));

  console.log('\n=== WAREHOUSES DETAILS ===');
  console.log(JSON.stringify(warehouses, null, 2));

  console.log('\n=== SUPPLIERS DETAILS ===');
  console.log(JSON.stringify(suppliers, null, 2));

  console.log('\n=== CUSTOMERS DETAILS ===');
  console.log(JSON.stringify(customers, null, 2));

  console.log('\n=== USERS DETAILS ===');
  console.log(JSON.stringify(users, null, 2));
}

inspectDb()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
