-- Add new fields to inventory_transactions table
ALTER TABLE inventory_transactions
ADD COLUMN IF NOT EXISTS ship_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS container_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ship_name ON inventory_transactions(ship_name);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_container_number ON inventory_transactions(container_number);