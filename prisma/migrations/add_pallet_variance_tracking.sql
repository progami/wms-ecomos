-- Add calculated pallet fields and variance notes to inventory_transactions
ALTER TABLE inventory_transactions
ADD COLUMN calculated_storage_pallets_in INTEGER,
ADD COLUMN calculated_shipping_pallets_out INTEGER,
ADD COLUMN pallet_variance_notes TEXT;

-- Add index on pallet variance notes for searching discrepancies
CREATE INDEX idx_pallet_variance ON inventory_transactions(pallet_variance_notes) WHERE pallet_variance_notes IS NOT NULL;