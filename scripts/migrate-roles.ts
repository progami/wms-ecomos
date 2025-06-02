import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Migrating user roles...')
  
  try {
    // First, update all users to have valid roles before schema change
    const users = await prisma.$queryRaw`
      UPDATE users 
      SET role = CASE 
        WHEN role = 'system_admin' THEN 'staff'
        WHEN role = 'finance_admin' THEN 'staff'
        WHEN role = 'warehouse_staff' THEN 'staff'
        WHEN role = 'manager' THEN 'staff'
        WHEN role = 'viewer' THEN 'staff'
        ELSE role
      END
      WHERE role IN ('system_admin', 'finance_admin', 'warehouse_staff', 'manager', 'viewer')
      RETURNING email, role;
    `
    
    console.log('Updated users:', users)
    
    // Update admin user specifically
    await prisma.$queryRaw`
      UPDATE users 
      SET role = 'admin'
      WHERE email = 'admin@warehouse.com';
    `
    
    console.log('✅ Migration complete!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()