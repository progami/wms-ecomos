-- This migration updates the UserRole enum from 5 roles to 2 roles
-- It must be run directly on the database

BEGIN;

-- Step 1: Create a new enum type with the desired values
CREATE TYPE "UserRole_new" AS ENUM ('admin', 'staff');

-- Step 2: Update the users table to use text temporarily
ALTER TABLE "users" ALTER COLUMN "role" TYPE text;

-- Step 3: Update existing values to new role names
UPDATE "users" 
SET role = 'admin' 
WHERE role IN ('system_admin');

UPDATE "users" 
SET role = 'staff' 
WHERE role IN ('warehouse_staff', 'finance_admin', 'manager', 'viewer');

-- Step 4: Drop the old enum
DROP TYPE "UserRole";

-- Step 5: Rename the new enum to the original name
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Step 6: Convert the column back to use the enum
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING role::"UserRole";

COMMIT;

-- Verify the results
SELECT email, role FROM "users" ORDER BY role, email;