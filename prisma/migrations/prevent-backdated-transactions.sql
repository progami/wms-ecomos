-- Create a function to check for backdated transactions
CREATE OR REPLACE FUNCTION check_transaction_date_order()
RETURNS TRIGGER AS $$
DECLARE
    last_transaction_date TIMESTAMP;
BEGIN
    -- Get the most recent transaction date for this warehouse
    SELECT MAX(transaction_date) INTO last_transaction_date
    FROM inventory_transactions
    WHERE warehouse_id = NEW.warehouse_id
    AND id != NEW.id;  -- Exclude current transaction in case of updates
    
    -- If there are existing transactions and the new date is earlier, reject
    IF last_transaction_date IS NOT NULL AND NEW.transaction_date < last_transaction_date THEN
        RAISE EXCEPTION 'Cannot create backdated transactions. Last transaction date for this warehouse: %. Attempted date: %', 
            last_transaction_date, NEW.transaction_date;
    END IF;
    
    -- Also prevent future dates
    IF NEW.transaction_date > CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Cannot create future-dated transactions. Current time: %. Attempted date: %', 
            CURRENT_TIMESTAMP, NEW.transaction_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS enforce_transaction_date_order_insert ON inventory_transactions;
CREATE TRIGGER enforce_transaction_date_order_insert
    BEFORE INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_transaction_date_order();

-- Create trigger for UPDATE operations (in case transaction_date is modified)
DROP TRIGGER IF EXISTS enforce_transaction_date_order_update ON inventory_transactions;
CREATE TRIGGER enforce_transaction_date_order_update
    BEFORE UPDATE OF transaction_date ON inventory_transactions
    FOR EACH ROW
    WHEN (OLD.transaction_date IS DISTINCT FROM NEW.transaction_date)
    EXECUTE FUNCTION check_transaction_date_order();

-- Add a comment explaining the constraint
COMMENT ON FUNCTION check_transaction_date_order() IS 
'Ensures inventory transactions are always in chronological order within each warehouse. 
Prevents backdated transactions and maintains ledger integrity.';

-- Create an index to improve performance of the date check
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_warehouse_date 
ON inventory_transactions(warehouse_id, transaction_date DESC);