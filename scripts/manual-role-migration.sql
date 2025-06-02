-- Step 1: Add new enum values to existing enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'staff';

-- Step 2: Update existing users to new roles
UPDATE users 
SET role = 'admin'
WHERE role = 'system_admin';

UPDATE users 
SET role = 'staff'
WHERE role IN ('finance_admin', 'warehouse_staff', 'manager', 'viewer');

-- Note: We cannot remove old enum values in PostgreSQL without recreating the type
-- But they won't be used anymore