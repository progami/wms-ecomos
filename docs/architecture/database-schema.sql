-- Warehouse Management System Database Schema
-- PostgreSQL with Prisma ORM

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    asin VARCHAR(100),
    description TEXT NOT NULL,
    pack_size INTEGER NOT NULL,
    material VARCHAR(100),
    unit_dimensions_cm VARCHAR(100),
    unit_weight_kg DECIMAL(10,3),
    units_per_carton INTEGER NOT NULL,
    carton_dimensions_cm VARCHAR(100),
    carton_weight_kg DECIMAL(10,3),
    packaging_type VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skus_code ON skus(sku_code);

-- SKU version tracking for changes over time
CREATE TABLE sku_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL,
    version_identifier VARCHAR(100) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    -- Copy of all SKU fields for historical tracking
    units_per_carton INTEGER NOT NULL,
    carton_dimensions_cm VARCHAR(100),
    carton_weight_kg DECIMAL(10,3),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    CONSTRAINT fk_sku_version_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT fk_sku_version_user FOREIGN KEY (created_by) REFERENCES users(id)
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
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    CONSTRAINT fk_config_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_config_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT fk_config_user FOREIGN KEY (created_by) REFERENCES users(id),
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
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    CONSTRAINT fk_cost_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_cost_user FOREIGN KEY (created_by) REFERENCES users(id),
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
    notes TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    CONSTRAINT fk_inv_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_inv_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT fk_inv_user FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT chk_cartons CHECK (cartons_in >= 0 AND cartons_out >= 0)
);

CREATE INDEX idx_inv_trans_date ON inventory_transactions(transaction_date);
CREATE INDEX idx_inv_trans_lookup ON inventory_transactions(warehouse_id, sku_id, batch_lot);

-- =====================================================
-- INVENTORY BALANCES (Materialized View)
-- =====================================================

CREATE TABLE inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    batch_lot VARCHAR(100) NOT NULL,
    current_cartons INTEGER NOT NULL DEFAULT 0,
    current_pallets INTEGER NOT NULL DEFAULT 0,
    current_units INTEGER NOT NULL DEFAULT 0,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_balance_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_balance_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT uq_inventory_balance UNIQUE (warehouse_id, sku_id, batch_lot),
    CONSTRAINT chk_positive_balance CHECK (current_cartons >= 0)
);

CREATE INDEX idx_balance_lookup ON inventory_balances(warehouse_id, sku_id, batch_lot);

-- =====================================================
-- STORAGE CALCULATIONS
-- =====================================================

CREATE TABLE storage_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sl_id VARCHAR(100) UNIQUE NOT NULL,
    week_ending_date DATE NOT NULL,
    warehouse_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    batch_lot VARCHAR(100) NOT NULL,
    cartons_end_of_monday INTEGER NOT NULL,
    storage_pallets_charged INTEGER NOT NULL,
    applicable_weekly_rate DECIMAL(10,2) NOT NULL,
    calculated_weekly_cost DECIMAL(12,2) NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_storage_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_storage_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT uq_storage_week UNIQUE (week_ending_date, warehouse_id, sku_id, batch_lot)
);

CREATE INDEX idx_storage_billing ON storage_ledger(billing_period_start, billing_period_end);
CREATE INDEX idx_storage_lookup ON storage_ledger(warehouse_id, week_ending_date);

-- =====================================================
-- COST CALCULATIONS
-- =====================================================

CREATE TABLE calculated_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculated_cost_id VARCHAR(100) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'inventory' or 'storage'
    transaction_reference_id VARCHAR(100) NOT NULL, -- Links to inventory_transactions.id or storage_ledger.id
    cost_rate_id UUID NOT NULL,
    warehouse_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    batch_lot VARCHAR(100),
    transaction_date DATE NOT NULL,
    billing_week_ending DATE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    quantity_charged DECIMAL(12,2) NOT NULL,
    applicable_rate DECIMAL(10,2) NOT NULL,
    calculated_cost DECIMAL(12,2) NOT NULL,
    cost_adjustment_value DECIMAL(12,2) DEFAULT 0,
    final_expected_cost DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    CONSTRAINT fk_calc_cost_rate FOREIGN KEY (cost_rate_id) REFERENCES cost_rates(id),
    CONSTRAINT fk_calc_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_calc_sku FOREIGN KEY (sku_id) REFERENCES skus(id),
    CONSTRAINT fk_calc_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_calc_costs_billing ON calculated_costs(billing_period_start, billing_period_end);
CREATE INDEX idx_calc_costs_lookup ON calculated_costs(warehouse_id, transaction_date);

-- =====================================================
-- INVOICING
-- =====================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, reconciled, disputed, paid
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    CONSTRAINT fk_invoice_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_invoice_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    cost_category cost_category NOT NULL,
    cost_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_rate DECIMAL(10,2),
    amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_line_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- =====================================================
-- RECONCILIATION
-- =====================================================

CREATE TABLE invoice_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    cost_category cost_category NOT NULL,
    cost_name VARCHAR(255) NOT NULL,
    expected_amount DECIMAL(12,2) NOT NULL,
    invoiced_amount DECIMAL(12,2) NOT NULL,
    difference DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'match', 'overbilled', 'underbilled'
    resolution_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recon_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT fk_recon_user FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    changes JSONB,
    user_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update inventory balances after transaction
CREATE OR REPLACE FUNCTION update_inventory_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory_balances (
        warehouse_id, sku_id, batch_lot, 
        current_cartons, current_pallets, current_units,
        last_transaction_date
    )
    VALUES (
        NEW.warehouse_id, NEW.sku_id, NEW.batch_lot,
        NEW.cartons_in - NEW.cartons_out,
        NEW.storage_pallets_in - NEW.shipping_pallets_out,
        (NEW.cartons_in - NEW.cartons_out) * (
            SELECT units_per_carton FROM skus WHERE id = NEW.sku_id
        ),
        NEW.transaction_date
    )
    ON CONFLICT (warehouse_id, sku_id, batch_lot)
    DO UPDATE SET
        current_cartons = inventory_balances.current_cartons + NEW.cartons_in - NEW.cartons_out,
        current_pallets = inventory_balances.current_pallets + NEW.storage_pallets_in - NEW.shipping_pallets_out,
        current_units = inventory_balances.current_units + 
            (NEW.cartons_in - NEW.cartons_out) * (
                SELECT units_per_carton FROM skus WHERE id = NEW.sku_id
            ),
        last_transaction_date = NEW.transaction_date,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_balance
AFTER INSERT OR UPDATE ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_balance();

-- Function to calculate billing period
CREATE OR REPLACE FUNCTION get_billing_period(check_date DATE)
RETURNS TABLE (period_start DATE, period_end DATE) AS $$
BEGIN
    IF EXTRACT(DAY FROM check_date) <= 15 THEN
        period_start := DATE_TRUNC('month', check_date - INTERVAL '1 month') + INTERVAL '15 days';
        period_end := DATE_TRUNC('month', check_date) + INTERVAL '14 days';
    ELSE
        period_start := DATE_TRUNC('month', check_date) + INTERVAL '15 days';
        period_end := DATE_TRUNC('month', check_date + INTERVAL '1 month') + INTERVAL '14 days';
    END IF;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_inv_trans_composite ON inventory_transactions(warehouse_id, sku_id, batch_lot, transaction_date);
CREATE INDEX idx_storage_composite ON storage_ledger(warehouse_id, sku_id, batch_lot, week_ending_date);
CREATE INDEX idx_calc_costs_composite ON calculated_costs(warehouse_id, billing_period_start, billing_period_end);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculated_costs ENABLE ROW LEVEL SECURITY;

-- Warehouse staff can only see their warehouse data
CREATE POLICY warehouse_staff_inventory ON inventory_transactions
    FOR ALL TO warehouse_staff
    USING (warehouse_id = current_setting('app.current_warehouse_id')::UUID);

-- Finance can see all data
CREATE POLICY finance_all_access ON inventory_transactions
    FOR ALL TO finance_admin
    USING (true);

-- Add similar policies for other tables...

-- =====================================================
-- SEED DATA FOR TESTING
-- =====================================================

-- This would be populated from your Excel import