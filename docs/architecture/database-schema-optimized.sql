-- Optimized Warehouse Management System Database Schema
-- PostgreSQL with Prisma ORM
-- Optimized by removing redundant columns and normalizing data

-- =====================================================
-- USER MANAGEMENT
-- =====================================================

CREATE TYPE user_role AS ENUM ('warehouse_staff', 'finance_admin', 'system_admin', 'manager', 'viewer');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    warehouse_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_user_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_warehouse ON users(warehouse_id);

-- =====================================================
-- MASTER DATA
-- =====================================================

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    asin VARCHAR(100),
    description TEXT NOT NULL,
    pack_size INTEGER NOT NULL,
    material VARCHAR(100),
    units_per_carton INTEGER NOT NULL,
    carton_dimensions_cm VARCHAR(100),
    carton_weight_kg DECIMAL(10,3),
    packaging_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_skus_code ON skus(sku_code);

-- SKU version tracking for changes over time (simplified)
CREATE TABLE sku_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    units_per_carton INTEGER NOT NULL,
    carton_dimensions_cm VARCHAR(100),
    carton_weight_kg DECIMAL(10,3),
    CONSTRAINT fk_sku_version_sku FOREIGN KEY (sku_id) REFERENCES skus(id)
);

-- =====================================================
-- WAREHOUSE CONFIGURATION
-- =====================================================

CREATE TABLE warehouse_sku_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    storage_cartons_per_pallet INTEGER NOT NULL,
    shipping_cartons_per_pallet INTEGER NOT NULL,
    max_stacking_height_cm INTEGER,
    effective_date DATE NOT NULL,
    end_date DATE,
    CONSTRAINT fk_config_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_config_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT uq_warehouse_sku_date UNIQUE (warehouse_id, sku_id, effective_date)
);

CREATE INDEX idx_warehouse_sku_config ON warehouse_sku_configs(warehouse_id, sku_id);

-- =====================================================
-- COST MANAGEMENT
-- =====================================================

CREATE TYPE cost_category AS ENUM ('Container', 'Carton', 'Pallet', 'Storage', 'Unit', 'Shipment', 'Accessorial');

CREATE TABLE cost_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL,
    cost_category cost_category NOT NULL,
    cost_name VARCHAR(255) NOT NULL,
    cost_value DECIMAL(12,2) NOT NULL,
    unit_of_measure VARCHAR(100) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    CONSTRAINT fk_cost_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT uq_cost_rate UNIQUE (warehouse_id, cost_name, effective_date)
);

CREATE INDEX idx_cost_rates_lookup ON cost_rates(warehouse_id, cost_name, effective_date);

-- =====================================================
-- INVENTORY TRANSACTIONS
-- =====================================================

CREATE TYPE transaction_type AS ENUM ('RECEIVE', 'SHIP', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER');

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    batch_lot VARCHAR(100) NOT NULL,
    transaction_type transaction_type NOT NULL,
    reference_id VARCHAR(255), -- Container#, Shipment ID, etc.
    cartons_in INTEGER DEFAULT 0,
    cartons_out INTEGER DEFAULT 0,
    storage_pallets_in INTEGER DEFAULT 0,
    shipping_pallets_out INTEGER DEFAULT 0,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_inv_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_inv_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT chk_cartons CHECK (cartons_in >= 0 AND cartons_out >= 0)
);

CREATE INDEX idx_inv_trans_date ON inventory_transactions(transaction_date);
CREATE INDEX idx_inv_trans_lookup ON inventory_transactions(warehouse_id, sku_id, batch_lot);

-- =====================================================
-- INVENTORY BALANCES (Simplified)
-- =====================================================

CREATE TABLE inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    batch_lot VARCHAR(100) NOT NULL,
    current_cartons INTEGER NOT NULL DEFAULT 0,
    current_pallets INTEGER NOT NULL DEFAULT 0,
    -- Removed current_units as it can be calculated from cartons * units_per_carton
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_balance_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_balance_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT uq_inventory_balance UNIQUE (warehouse_id, sku_id, batch_lot),
    CONSTRAINT chk_positive_balance CHECK (current_cartons >= 0)
);

CREATE INDEX idx_balance_lookup ON inventory_balances(warehouse_id, sku_id, batch_lot);

-- =====================================================
-- STORAGE CALCULATIONS (Simplified)
-- =====================================================

CREATE TABLE storage_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_ending_date DATE NOT NULL,
    warehouse_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    batch_lot VARCHAR(100) NOT NULL,
    cartons_end_of_monday INTEGER NOT NULL,
    storage_pallets_charged INTEGER NOT NULL,
    -- Removed calculated fields and redundant billing period columns
    CONSTRAINT fk_storage_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_storage_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT uq_storage_week UNIQUE (week_ending_date, warehouse_id, sku_id, batch_lot)
);

CREATE INDEX idx_storage_week ON storage_ledger(week_ending_date);
CREATE INDEX idx_storage_lookup ON storage_ledger(warehouse_id, sku_id);

-- =====================================================
-- COST CALCULATIONS (Simplified)
-- =====================================================

CREATE TABLE calculated_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) NOT NULL, -- 'inventory' or 'storage'
    transaction_reference_id UUID NOT NULL, -- Links to inventory_transactions.id or storage_ledger.id
    cost_rate_id UUID NOT NULL,
    quantity_charged DECIMAL(12,2) NOT NULL,
    cost_adjustment_value DECIMAL(12,2) DEFAULT 0,
    transaction_date DATE NOT NULL,
    -- Removed redundant warehouse_id, sku_id, batch_lot (can be joined)
    -- Removed calculated fields
    CONSTRAINT fk_calc_cost_rate FOREIGN KEY (cost_rate_id) REFERENCES cost_rates(id)
);

CREATE INDEX idx_calc_costs_date ON calculated_costs(transaction_date);
CREATE INDEX idx_calc_costs_ref ON calculated_costs(transaction_reference_id);

-- =====================================================
-- BILLING PERIODS (New normalized table)
-- =====================================================

CREATE TABLE billing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    CONSTRAINT uq_billing_period UNIQUE (period_start, period_end)
);

-- =====================================================
-- INVOICING (Simplified)
-- =====================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL,
    billing_period_id UUID NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total_amount DECIMAL(12,2) NOT NULL,
    -- Removed status (derive from reconciliation)
    CONSTRAINT fk_invoice_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_invoice_period FOREIGN KEY (billing_period_id) REFERENCES billing_periods(id)
);

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    cost_category cost_category NOT NULL,
    cost_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_rate DECIMAL(10,2),
    amount DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_line_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- =====================================================
-- RECONCILIATION (Simplified)
-- =====================================================

CREATE TABLE invoice_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    cost_category cost_category NOT NULL,
    cost_name VARCHAR(255) NOT NULL,
    expected_amount DECIMAL(12,2) NOT NULL,
    invoiced_amount DECIMAL(12,2) NOT NULL,
    -- Removed difference (can be calculated)
    status VARCHAR(50) NOT NULL, -- 'match', 'overbilled', 'underbilled'
    resolution_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_recon_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT fk_recon_user FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- =====================================================
-- AUDIT LOG (Unified for all tables)
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    changes JSONB,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =====================================================
-- VIEWS FOR COMPUTED VALUES
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
    sl.storage_pallets_charged * cr.cost_value AS calculated_weekly_cost
FROM storage_ledger sl
JOIN cost_rates cr ON 
    cr.warehouse_id = sl.warehouse_id 
    AND cr.cost_category = 'Storage'
    AND cr.cost_name = 'Weekly Storage'
    AND sl.week_ending_date BETWEEN cr.effective_date AND COALESCE(cr.end_date, '9999-12-31');

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
-- OPTIMIZATIONS SUMMARY
-- =====================================================
-- 1. Removed redundant created_at/updated_at columns (use audit_logs)
-- 2. Removed redundant warehouse_id/sku_id from calculated_costs (join through references)
-- 3. Removed calculated fields that can be computed via views
-- 4. Normalized billing periods into separate table
-- 5. Removed redundant billing period columns from multiple tables
-- 6. Simplified inventory_balances (removed computed units field)
-- 7. Removed unnecessary notes columns from some tables
-- 8. Created views for commonly calculated values
-- 9. Unified audit logging instead of per-table created_by columns
-- 10. Removed redundant status fields that can be derived