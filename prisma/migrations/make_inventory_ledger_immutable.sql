-- Make inventory ledger immutable
-- This is a standard practice for audit trails and data integrity

-- Create a function to prevent updates to inventory_transactions
CREATE OR REPLACE FUNCTION prevent_inventory_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates only to specific system fields that don't affect the ledger integrity
    IF OLD.transaction_id != NEW.transaction_id OR
       OLD.warehouse_id != NEW.warehouse_id OR
       OLD.sku_id != NEW.sku_id OR
       OLD.batch_lot != NEW.batch_lot OR
       OLD.transaction_type != NEW.transaction_type OR
       OLD.reference_id IS DISTINCT FROM NEW.reference_id OR
       OLD.cartons_in != NEW.cartons_in OR
       OLD.cartons_out != NEW.cartons_out OR
       OLD.storage_pallets_in != NEW.storage_pallets_in OR
       OLD.shipping_pallets_out != NEW.shipping_pallets_out OR
       OLD.transaction_date != NEW.transaction_date OR
       OLD.created_at != NEW.created_at OR
       OLD.created_by != NEW.created_by THEN
        RAISE EXCEPTION 'Inventory transactions are immutable and cannot be modified. Please create an adjustment transaction instead.';
    END IF;
    
    -- Allow only specific fields to be updated (like calculated fields or notes)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to prevent deletes (with controlled exceptions)
CREATE OR REPLACE FUNCTION prevent_inventory_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a system maintenance operation (optional - remove if you want absolute immutability)
    IF current_setting('app.allow_inventory_delete', true) = 'true' THEN
        RETURN OLD;
    END IF;
    
    RAISE EXCEPTION 'Inventory transactions are immutable and cannot be deleted. Please create an adjustment transaction to correct errors.';
END;
$$ LANGUAGE plpgsql;

-- Create triggers to enforce immutability
DROP TRIGGER IF EXISTS enforce_inventory_immutability_update ON inventory_transactions;
CREATE TRIGGER enforce_inventory_immutability_update
BEFORE UPDATE ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_inventory_transaction_update();

DROP TRIGGER IF EXISTS enforce_inventory_immutability_delete ON inventory_transactions;
CREATE TRIGGER enforce_inventory_immutability_delete
BEFORE DELETE ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_inventory_transaction_delete();

-- Create an audit log table to track any attempts to modify the ledger
CREATE TABLE IF NOT EXISTS inventory_audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(10) NOT NULL,
    transaction_id VARCHAR(255),
    attempted_by VARCHAR(255),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    old_data JSONB,
    new_data JSONB
);

-- Create a function to log failed modification attempts
CREATE OR REPLACE FUNCTION log_inventory_modification_attempt()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory_audit_log (
        action,
        transaction_id,
        attempted_by,
        error_message,
        old_data,
        new_data
    ) VALUES (
        TG_OP,
        COALESCE(OLD.transaction_id, NEW.transaction_id),
        current_user,
        'Attempted to modify immutable inventory transaction',
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add index on transaction_date for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date 
ON inventory_transactions(transaction_date DESC);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_warehouse_sku_batch 
ON inventory_transactions(warehouse_id, sku_id, batch_lot);

-- Create a view for safe querying without accidental modifications
CREATE OR REPLACE VIEW inventory_ledger_view AS
SELECT 
    it.*,
    w.name as warehouse_name,
    w.code as warehouse_code,
    s.sku_code,
    s.description as sku_description,
    u.full_name as created_by_name
FROM inventory_transactions it
JOIN warehouses w ON it.warehouse_id = w.id
JOIN skus s ON it.sku_id = s.id
JOIN users u ON it.created_by = u.id
ORDER BY it.transaction_date DESC, it.created_at DESC;

-- Grant appropriate permissions (adjust based on your user roles)
GRANT SELECT ON inventory_ledger_view TO PUBLIC;
GRANT INSERT ON inventory_transactions TO PUBLIC;
-- Explicitly revoke UPDATE and DELETE
REVOKE UPDATE, DELETE ON inventory_transactions FROM PUBLIC;

-- Add helpful comment
COMMENT ON TABLE inventory_transactions IS 'Immutable ledger of all inventory movements. Updates and deletes are not allowed to maintain data integrity and audit trail. Use adjustment transactions to correct errors.';