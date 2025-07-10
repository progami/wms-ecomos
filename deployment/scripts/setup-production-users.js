#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Generate secure random password
function generateSecurePassword() {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(crypto.randomInt(charset.length));
  }
  
  return password;
}

async function cleanupDatabase() {
  console.log('\n⚠️  WARNING: This will DELETE ALL DATA from the database!');
  console.log('This includes:');
  console.log('  - All users (including admin accounts)');
  console.log('  - All products and inventory');
  console.log('  - All customers and transactions');
  console.log('  - All invoices and financial data');
  console.log('  - All warehouse configurations');
  console.log('\nThe database schema will remain intact.\n');

  const confirmation = await question('Type "DELETE ALL DATA" to confirm: ');
  
  if (confirmation !== 'DELETE ALL DATA') {
    console.log('❌ Cleanup cancelled.');
    process.exit(0);
  }

  console.log('\n🗑️  Starting database cleanup...');

  try {
    // Delete in correct order to respect foreign key constraints
    console.log('Deleting audit logs...');
    await prisma.auditLog.deleteMany({});
    
    console.log('Deleting invoice reconciliations...');
    await prisma.invoiceReconciliation.deleteMany({});
    
    console.log('Deleting invoice line items...');
    await prisma.invoiceLineItem.deleteMany({});
    
    console.log('Deleting invoices...');
    await prisma.invoice.deleteMany({});
    
    console.log('Deleting calculated costs...');
    await prisma.calculatedCost.deleteMany({});
    
    console.log('Deleting inventory transactions...');
    await prisma.inventoryTransaction.deleteMany({});
    
    console.log('Deleting inventory balances...');
    await prisma.inventoryBalance.deleteMany({});
    
    console.log('Deleting SKU versions...');
    await prisma.skuVersion.deleteMany({});
    
    console.log('Deleting warehouse SKU configs...');
    await prisma.warehouseSkuConfig.deleteMany({});
    
    console.log('Deleting SKUs...');
    await prisma.sku.deleteMany({});
    
    console.log('Deleting cost rates...');
    await prisma.costRate.deleteMany({});
    
    console.log('Deleting users...');
    await prisma.user.deleteMany({});
    
    console.log('Deleting warehouses...');
    await prisma.warehouse.deleteMany({});

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('The database is now empty and ready for new data.');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

async function setupUsers() {
  console.log('\n🔐 Setting up production users for Trademan Enterprise...\n');

  const users = [
    {
      email: 'ajarrar@trademanenterprise.com',
      fullName: 'A. Jarrar',
      username: 'ajarrar',
      role: 'admin',
    },
    {
      email: 'umairafzal@trademanenterprise.com',
      fullName: 'Umair Afzal',
      username: 'umairafzal',
      role: 'staff',
    },
    {
      email: 'hashar.awan@trademanenterprise.com',
      fullName: 'Hashar Awan',
      username: 'hasharawan',
      role: 'staff',
    },
  ];

  const passwords = {};

  try {
    for (const userData of users) {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { username: userData.username }
          ]
        }
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Generate secure password
      const password = generateSecurePassword();
      passwords[userData.email] = password;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          passwordHash,
          fullName: userData.fullName,
          role: userData.role,
          isActive: true,
          isDemo: false,
        },
      });

      console.log(`✅ Created ${userData.role} user: ${user.email}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔑 USER CREDENTIALS (SAVE THESE NOW!)');
    console.log('='.repeat(60));
    
    for (const [email, password] of Object.entries(passwords)) {
      console.log(`\nEmail: ${email}`);
      console.log(`Password: ${password}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  IMPORTANT: Save these passwords immediately!');
    console.log('They will not be shown again.');
    console.log('='.repeat(60) + '\n');

    // Create default warehouse if none exists
    const warehouseCount = await prisma.warehouse.count();
    if (warehouseCount === 0) {
      console.log('Creating default warehouse...');
      await prisma.warehouse.create({
        data: {
          code: 'MAIN',
          name: 'Main Warehouse',
          address: 'Trademan Enterprise Main Facility',
          isActive: true,
          contactEmail: 'warehouse@trademanenterprise.com',
        },
      });
      console.log('✅ Created default warehouse');
    }

    console.log('\n✅ User setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error setting up users:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    await cleanupDatabase();
    await setupUsers();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();