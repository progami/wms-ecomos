-- Migration Script: From Original to Optimized Schema
-- This script shows how to migrate from the redundant schema to the optimized version
-- IMPORTANT: Backup your database before running this migration

-- =====================================================
-- STEP 1: Create new tables that don't exist
-- =====================================================

-- Create billing_periods table to normalize billing period data
CREATE TABLE billing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    CONSTRAINT uq_billing_period UNIQUE (period_start, period_end)
);

-- Populate billing_periods from existing data
INSERT INTO billing_periods (period_start, period_end)
SELECT DISTINCT billing_period_start, billing_period_end
FROM storage_ledger
UNION
SELECT DISTINCT billing_period_start, billing_period_end
FROM calculated_costs
UNION
SELECT DISTINCT billing_period_start, billing_period_end
FROM invoices;

-- =====================================================
-- STEP 2: Create views for computed values
-- =====================================================

-- View to calculate current units from cartons
CREATE VIEW inventory_units_view AS
SELECT 
    ib.id,
    ib.warehouse_id,
    ib.sku_id,
    ib.batch_lot,
    ib.current_cartons,
    ib.current_cartons * s.units_per_carton AS current_units
FROM inventory_balances ib
JOIN skus s ON ib.sku_id = s.id;

-- View to calculate storage costs
CREATE VIEW storage_costs_view AS
SELECT 
    sl.id,
    sl.week_ending_date,
    sl.warehouse_id,
    sl.sku_id,
    sl.batch_lot,
    sl.storage_pallets_charged,
    cr.cost_value AS weekly_rate,
    sl.storage_pallets_charged * cr.cost_value AS calculated_weekly_cost,
    bp.id as billing_period_id
FROM storage_ledger sl
JOIN cost_rates cr ON 
    cr.warehouse_id = sl.warehouse_id 
    AND cr.cost_category = 'Storage'
    AND cr.cost_name = 'Weekly Storage'
    AND sl.week_ending_date BETWEEN cr.effective_date AND COALESCE(cr.end_date, '9999-12-31')
JOIN billing_periods bp ON 
    sl.billing_period_start = bp.period_start 
    AND sl.billing_period_end = bp.period_end;

-- View to calculate reconciliation differences
CREATE VIEW reconciliation_view AS
SELECT 
    ir.*,
    ir.invoiced_amount - ir.expected_amount AS difference,
    CASE 
        WHEN ir.invoiced_amount = ir.expected_amount THEN 'Matched'
        WHEN ir.invoiced_amount > ir.expected_amount THEN 'Overbilled'
        ELSE 'Underbilled'
    END AS variance_status
FROM invoice_reconciliations ir;

-- =====================================================
-- STEP 3: Migrate audit data to unified audit_logs
-- =====================================================

-- First, ensure all tables have audit data captured
INSERT INTO audit_logs (table_name, record_id, action, changes, user_id, created_at)
SELECT 
    'users' as table_name,
    id as record_id,
    'INSERT' as action,
    jsonb_build_object(
        'email', email,
        'full_name', full_name,
        'role', role
    ) as changes,
    id as user_id,  -- Self-created for initial records
    created_at
FROM users;

-- Add similar INSERT statements for other tables...

-- =====================================================
-- STEP 4: Alter existing tables to remove redundant columns
-- =====================================================

-- Remove redundant audit columns
ALTER TABLE users DROP COLUMN IF EXISTS created_at;
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;

ALTER TABLE warehouses DROP COLUMN IF EXISTS created_at;
ALTER TABLE warehouses DROP COLUMN IF EXISTS updated_at;

ALTER TABLE skus DROP COLUMN IF EXISTS created_at;
ALTER TABLE skus DROP COLUMN IF EXISTS updated_at;
ALTER TABLE skus DROP COLUMN IF EXISTS notes;
ALTER TABLE skus DROP COLUMN IF EXISTS unit_dimensions_cm;
ALTER TABLE skus DROP COLUMN IF EXISTS unit_weight_kg;

-- Remove redundant columns from warehouse_sku_configs
ALTER TABLE warehouse_sku_configs DROP COLUMN IF EXISTS created_at;
ALTER TABLE warehouse_sku_configs DROP COLUMN IF EXISTS updated_at;
ALTER TABLE warehouse_sku_configs DROP COLUMN IF EXISTS created_by;
ALTER TABLE warehouse_sku_configs DROP COLUMN IF EXISTS notes;

-- Remove redundant columns from cost_rates
ALTER TABLE cost_rates DROP COLUMN IF EXISTS created_at;
ALTER TABLE cost_rates DROP COLUMN IF EXISTS updated_at;
ALTER TABLE cost_rates DROP COLUMN IF EXISTS created_by;
ALTER TABLE cost_rates DROP COLUMN IF EXISTS notes;

-- Remove redundant columns from inventory_transactions
ALTER TABLE inventory_transactions DROP COLUMN IF EXISTS created_at;
ALTER TABLE inventory_transactions DROP COLUMN IF EXISTS created_by;
ALTER TABLE inventory_transactions DROP COLUMN IF EXISTS notes;

-- Remove computed column from inventory_balances
ALTER TABLE inventory_balances DROP COLUMN IF EXISTS current_units;
ALTER TABLE inventory_balances DROP COLUMN IF EXISTS last_updated;

-- Remove redundant columns from storage_ledger
ALTER TABLE storage_ledger DROP COLUMN IF EXISTS sl_id;
ALTER TABLE storage_ledger DROP COLUMN IF EXISTS applicable_weekly_rate;
ALTER TABLE storage_ledger DROP COLUMN IF EXISTS calculated_weekly_cost;
ALTER TABLE storage_ledger DROP COLUMN IF EXISTS billing_period_start;
ALTER TABLE storage_ledger DROP COLUMN IF EXISTS billing_period_end;
ALTER TABLE storage_ledger DROP COLUMN IF EXISTS created_at;

-- =====================================================
-- STEP 5: Update calculated_costs table
-- =====================================================

-- Create new optimized calculated_costs table
CREATE TABLE calculated_costs_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) NOT NULL,
    transaction_reference_id UUID NOT NULL,
    cost_rate_id UUID NOT NULL,
    quantity_charged DECIMAL(12,2) NOT NULL,
    cost_adjustment_value DECIMAL(12,2) DEFAULT 0,
    transaction_date DATE NOT NULL,
    CONSTRAINT fk_calc_cost_rate FOREIGN KEY (cost_rate_id) REFERENCES cost_rates(id)
);

-- Migrate data
INSERT INTO calculated_costs_new (
    id, transaction_type, transaction_reference_id, cost_rate_id,
    quantity_charged, cost_adjustment_value, transaction_date
)
SELECT 
    id, 
    transaction_type,
    transaction_reference_id::UUID,
    cost_rate_id,
    quantity_charged,
    cost_adjustment_value,
    transaction_date
FROM calculated_costs;

-- Drop old table and rename new
DROP TABLE calculated_costs;
ALTER TABLE calculated_costs_new RENAME TO calculated_costs;

-- =====================================================
-- STEP 6: Update invoices table
-- =====================================================

-- Add billing_period_id column
ALTER TABLE invoices ADD COLUMN billing_period_id UUID;

-- Update with billing period references
UPDATE invoices i
SET billing_period_id = bp.id
FROM billing_periods bp
WHERE i.billing_period_start = bp.period_start
  AND i.billing_period_end = bp.period_end;

-- Make it required and add constraint
ALTER TABLE invoices ALTER COLUMN billing_period_id SET NOT NULL;
ALTER TABLE invoices ADD CONSTRAINT fk_invoice_period 
    FOREIGN KEY (billing_period_id) REFERENCES billing_periods(id);

-- Remove redundant columns
ALTER TABLE invoices DROP COLUMN billing_period_start;
ALTER TABLE invoices DROP COLUMN billing_period_end;
ALTER TABLE invoices DROP COLUMN status;
ALTER TABLE invoices DROP COLUMN notes;
ALTER TABLE invoices DROP COLUMN created_at;
ALTER TABLE invoices DROP COLUMN updated_at;
ALTER TABLE invoices DROP COLUMN created_by;

-- Remove redundant columns from invoice_line_items
ALTER TABLE invoice_line_items DROP COLUMN notes;
ALTER TABLE invoice_line_items DROP COLUMN created_at;

-- =====================================================
-- STEP 7: Update invoice_reconciliations table
-- =====================================================

-- Remove computed difference column
ALTER TABLE invoice_reconciliations DROP COLUMN difference;
ALTER TABLE invoice_reconciliations DROP COLUMN created_at;

-- =====================================================
-- STEP 8: Clean up indexes
-- =====================================================

-- Drop redundant indexes
DROP INDEX IF EXISTS idx_storage_billing;
DROP INDEX IF EXISTS idx_calc_costs_billing;

-- Create new optimized indexes
CREATE INDEX idx_calc_costs_date ON calculated_costs(transaction_date);
CREATE INDEX idx_calc_costs_ref ON calculated_costs(transaction_reference_id);
CREATE INDEX idx_storage_week ON storage_ledger(week_ending_date);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =====================================================
-- STEP 9: Update application queries
-- =====================================================

-- Example of updating queries to use views instead of computed columns:

-- OLD QUERY:
-- SELECT current_units FROM inventory_balances WHERE id = ?

-- NEW QUERY:
-- SELECT current_units FROM inventory_units_view WHERE id = ?

-- OLD QUERY:
-- SELECT calculated_weekly_cost FROM storage_ledger WHERE id = ?

-- NEW QUERY:
-- SELECT calculated_weekly_cost FROM storage_costs_view WHERE id = ?

-- =====================================================
-- STEP 10: Performance improvements
-- =====================================================

-- Add covering indexes for common queries
CREATE INDEX idx_invoice_warehouse_date ON invoices(warehouse_id, invoice_date);
CREATE INDEX idx_storage_warehouse_week ON storage_ledger(warehouse_id, week_ending_date);

-- Analyze tables for query optimization
ANALYZE warehouses;
ANALYZE skus;
ANALYZE inventory_transactions;
ANALYZE inventory_balances;
ANALYZE storage_ledger;
ANALYZE calculated_costs;
ANALYZE invoices;

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================

-- To rollback, you would need to:
-- 1. Re-add the dropped columns
-- 2. Restore data from backup
-- 3. Drop the new tables and views
-- This is why a full backup is essential before migration