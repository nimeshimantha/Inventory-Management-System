import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPersistence() {
  console.log('--- TESTING USER DATA PERSISTENCE ---');
  
  // 1. Create a Category
  const cat = await prisma.category.create({
    data: {
      name: 'Enterprise Networking',
      slug: 'enterprise-networking',
      description: 'Switches, routers and wireless infrastructure',
    },
  });
  console.log('✅ Created Category in PostgreSQL:', cat.name, '(ID:', cat.id, ')');

  // 2. Create a Brand
  const brand = await prisma.brand.create({
    data: {
      name: 'Cisco Systems',
      slug: 'cisco-systems',
      description: 'Enterprise network hardware',
    },
  });
  console.log('✅ Created Brand in PostgreSQL:', brand.name, '(ID:', brand.id, ')');

  // 3. Create a Product
  const prod = await prisma.product.create({
    data: {
      name: 'Cisco Catalyst 9300 48-Port Switch',
      sku: 'CSCO-CAT-9300',
      barcode: '792817491023',
      description: 'Stackable 48-port Gigabit PoE+ enterprise switch.',
      categoryId: cat.id,
      brandId: brand.id,
      unit: 'pcs',
      costPrice: 2800.00,
      sellingPrice: 4200.00,
      taxRate: 8.25,
      reorderLevel: 5,
    },
  });
  console.log('✅ Created Product in PostgreSQL:', prod.name, '(SKU:', prod.sku, ')');

  // 4. Verify fetch
  const found = await prisma.product.findUnique({
    where: { sku: 'CSCO-CAT-9300' },
    include: { category: true, brand: true },
  });
  console.log('✅ Verified retrieval from PostgreSQL:');
  console.log('   - Name:', found?.name);
  console.log('   - SKU:', found?.sku);
  console.log('   - Category:', found?.category?.name);
  console.log('   - Brand:', found?.brand?.name);
}

testPersistence()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
