#!/usr/bin/env tsx

import { generateDemoData, clearDemoData, setProgressCallback } from '../src/lib/demo/demo-data-generator'

async function main() {
  const command = process.argv[2]
  
  // Set up progress reporting for CLI
  setProgressCallback((message: string, progress: number) => {
    const progressBar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2))
    process.stdout.write(`\r[${progressBar}] ${Math.round(progress)}% - ${message}`)
    if (progress === 100) {
      console.log('\n')
    }
  })
  
  if (command === 'generate') {
    console.log('🚀 Starting comprehensive demo data generation...')
    console.log('This will create 6 months of realistic warehouse data.\n')
    
    try {
      const stats = await generateDemoData()
      
      console.log('\n✨ Demo data generation completed successfully!')
      console.log('\nYou can now log in with these credentials:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('Admin User:')
      console.log('  Email: admin@warehouse.com')
      console.log('  Password: admin123')
      console.log('')
      console.log('Staff Users:')
      console.log('  Email: staff.lax-01@warehouse.com')
      console.log('  Password: staff123')
      console.log('')
      console.log('Customer Users:')
      console.log('  Email: amazon.seller@example.com')
      console.log('  Password: customer123')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      process.exit(0)
    } catch (error) {
      console.error('\n❌ Error generating demo data:', error)
      process.exit(1)
    }
  } else if (command === 'clear') {
    console.log('🧹 Clearing all demo data...')
    
    try {
      await clearDemoData()
      console.log('✅ All demo data cleared successfully!')
      process.exit(0)
    } catch (error) {
      console.error('❌ Error clearing demo data:', error)
      process.exit(1)
    }
  } else {
    console.log('Warehouse Management System - Demo Data Generator')
    console.log('================================================\n')
    console.log('Usage:')
    console.log('  npm run demo:generate    Generate comprehensive demo data')
    console.log('  npm run demo:clear       Clear all demo data')
    console.log('')
    console.log('The demo data includes:')
    console.log('  • 5 warehouses across the US')
    console.log('  • 30+ SKUs with realistic product data')
    console.log('  • 6 months of inventory transactions')
    console.log('  • Seasonal patterns and FBA shipments')
    console.log('  • Invoices, disputes, and payments')
    console.log('  • Pallet variances and notifications')
    console.log('  • Complete audit trail')
    process.exit(1)
  }
}

main()