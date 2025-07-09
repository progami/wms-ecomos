#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Generate secure random password
function generateSecurePassword(): string {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(crypto.randomInt(charset.length))
  }
  
  return password
}

async function setupUsers() {
  console.log('\n🔐 Setting up production users for Trademan Enterprise...\n')

  const users = [
    {
      email: 'ajarrar@trademanenterprise.com',
      fullName: 'A. Jarrar',
      username: 'ajarrar',
      role: 'admin' as const,
    },
    {
      email: 'umairafzal@trademanenterprise.com',
      fullName: 'Umair Afzal',
      username: 'umairafzal',
      role: 'staff' as const,
    },
    {
      email: 'hashar.awan@trademanenterprise.com',
      fullName: 'Hashar Awan',
      username: 'hasharawan',
      role: 'staff' as const,
    },
  ]

  const passwords: Record<string, string> = {}

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
      })

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`)
        continue
      }

      // Generate secure password
      const password = generateSecurePassword()
      passwords[userData.email] = password

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10)

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
      })

      console.log(`✅ Created ${userData.role} user: ${user.email}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('🔑 USER CREDENTIALS (SAVE THESE NOW!)')
    console.log('='.repeat(60))
    
    for (const [email, password] of Object.entries(passwords)) {
      console.log(`\nEmail: ${email}`)
      console.log(`Password: ${password}`)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('⚠️  IMPORTANT: Save these passwords immediately!')
    console.log('They will not be shown again.')
    console.log('='.repeat(60) + '\n')

    // Create default warehouse if none exists
    const warehouseCount = await prisma.warehouse.count()
    if (warehouseCount === 0) {
      console.log('Creating default warehouse...')
      await prisma.warehouse.create({
        data: {
          code: 'MAIN',
          name: 'Main Warehouse',
          address: 'Trademan Enterprise Main Facility',
          isActive: true,
          contactEmail: 'warehouse@trademanenterprise.com',
        },
      })
      console.log('✅ Created default warehouse')
    }

    console.log('\n✅ User setup completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Error setting up users:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setupUsers()