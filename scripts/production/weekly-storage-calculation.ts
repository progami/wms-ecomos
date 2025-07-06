#!/usr/bin/env node

/**
 * Weekly Storage Calculation Script
 * This script should be run every Monday morning to calculate storage costs
 * for the previous week for all warehouses.
 * 
 * Usage:
 * - Run manually: npm run calculate:storage:weekly
 * - Set up as cron job: 0 2 * * 1 /usr/bin/node /path/to/weekly-storage-calculation.js
 */

import { prisma } from '../../src/lib/prisma'
import { CostCalculationService } from '../../src/lib/services/cost-calculation-service'
import { auditLog } from '../../src/lib/security/audit-logger'
import { endOfWeek } from 'date-fns'

const SYSTEM_USER_ID = 'system' // You should create a system user in your database

async function runWeeklyStorageCalculation() {
  console.log('=== Weekly Storage Calculation Starting ===')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  
  try {
    // Get the week ending date (last Sunday)
    const weekEndingDate = endOfWeek(new Date(), { weekStartsOn: 1 })
    console.log(`Calculating storage for week ending: ${weekEndingDate.toLocaleDateString()}`)
    
    // Get all active warehouses
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true }
    })
    
    console.log(`Found ${warehouses.length} active warehouses`)
    
    const results = {
      successful: 0,
      failed: 0,
      totalProcessed: 0,
      totalErrors: 0,
      warehouseResults: [] as any[]
    }
    
    // Process each warehouse
    for (const warehouse of warehouses) {
      console.log(`\nProcessing warehouse: ${warehouse.name} (${warehouse.code})`)
      
      try {
        const result = await CostCalculationService.calculateWeeklyStorageCosts(
          weekEndingDate,
          SYSTEM_USER_ID,
          warehouse.id
        )
        
        results.successful++
        results.totalProcessed += result.processed
        results.totalErrors += result.errors
        
        results.warehouseResults.push({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          warehouseCode: warehouse.code,
          processed: result.processed,
          errors: result.errors,
          status: 'success'
        })
        
        console.log(`✓ Completed: ${result.processed} processed, ${result.errors} errors`)
      } catch (error) {
        results.failed++
        
        results.warehouseResults.push({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          warehouseCode: warehouse.code,
          processed: 0,
          errors: 1,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        console.error(`✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    // Log summary to audit log
    await auditLog({
      entityType: 'StorageCalculation',
      entityId: `WEEKLY-CRON-${weekEndingDate.toISOString()}`,
      action: 'COMPLETE',
      userId: SYSTEM_USER_ID,
      data: {
        weekEndingDate: weekEndingDate.toISOString(),
        warehousesProcessed: warehouses.length,
        successful: results.successful,
        failed: results.failed,
        totalInventoryProcessed: results.totalProcessed,
        totalErrors: results.totalErrors,
        warehouseResults: results.warehouseResults
      }
    })
    
    // Print summary
    console.log('\n=== Weekly Storage Calculation Summary ===')
    console.log(`Warehouses processed: ${warehouses.length}`)
    console.log(`Successful: ${results.successful}`)
    console.log(`Failed: ${results.failed}`)
    console.log(`Total inventory records processed: ${results.totalProcessed}`)
    console.log(`Total errors: ${results.totalErrors}`)
    console.log(`Completed at: ${new Date().toISOString()}`)
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('Fatal error in weekly storage calculation:', error)
    
    await auditLog({
      entityType: 'StorageCalculation',
      entityId: 'WEEKLY-CRON-ERROR',
      action: 'FAILED',
      userId: SYSTEM_USER_ID,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    })
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if running directly (not imported)
if (require.main === module) {
  runWeeklyStorageCalculation()
}

export { runWeeklyStorageCalculation }