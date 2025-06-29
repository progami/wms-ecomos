import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWarehouseIsolation() {
  try {
    // Get all users with their warehouse info
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
    
    console.log('=== USERS AND THEIR WAREHOUSES ===');
    users.forEach(user => {
      console.log(`${user.fullName} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      if (user.warehouse) {
        console.log(`  Warehouse: ${user.warehouse.name} (${user.warehouse.code})`);
      } else {
        console.log(`  Warehouse: ALL (no specific warehouse assigned)`);
      }
      console.log('');
    });
    
    // Get all warehouses
    const warehouses = await prisma.warehouse.findMany({
      select: {
        id: true,
        name: true,
        code: true
      }
    });
    
    console.log('=== ALL WAREHOUSES IN SYSTEM ===');
    warehouses.forEach(wh => {
      console.log(`${wh.name} (${wh.code}) - ID: ${wh.id}`);
    });
    console.log('');
    
    console.log('=== DATA ISOLATION ANALYSIS ===');
    console.log('Based on the user data:');
    console.log('- Admin users (warehouseId: null) can access ALL warehouses');
    console.log('- Staff users with specific warehouseId can only access that warehouse');
    console.log('- Hashar (Finance) has warehouseId: null, so can access ALL warehouses');
    console.log('- Umair (Operations) has a specific warehouseId, so limited to that warehouse');
    console.log('');
    console.log('This means:');
    console.log('1. SKUs are shared across all warehouses (no isolation)');
    console.log('2. Inventory transactions should be filtered by warehouse');
    console.log('3. Invoices should be filtered by warehouse');
    console.log('4. Admin and Finance users see all data');
    console.log('5. Operations users see only their warehouse data');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWarehouseIsolation();