-- Add pickup_date and is_reconciled columns to inventory_transactions
ALTER TABLE inventory_transactions 
ADD COLUMN pickup_date TIMESTAMP(3),
ADD COLUMN is_reconciled BOOLEAN NOT NULL DEFAULT false;

-- Set pickup_date to createdAt for existing transactions
UPDATE inventory_transactions 
SET pickup_date = created_at 
WHERE pickup_date IS NULL;

-- Add index on pickup_date for performance
CREATE INDEX idx_inventory_transactions_pickup_date ON inventory_transactions(pickup_date);

-- Add index on is_reconciled for filtering unreconciled transactions
CREATE INDEX idx_inventory_transactions_reconciled ON inventory_transactions(is_reconciled);