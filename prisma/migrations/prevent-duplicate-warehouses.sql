-- SQL script to add unique constraints to prevent duplicate warehouses with different cases

-- Create a unique index on lowercase warehouse name
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_name_lower ON warehouses (LOWER(name));

-- Create a unique index on lowercase warehouse code (in addition to existing unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_code_lower ON warehouses (LOWER(code));

-- Note: The existing unique constraint on 'code' column ensures exact uniqueness,
-- while these new indexes ensure case-insensitive uniqueness