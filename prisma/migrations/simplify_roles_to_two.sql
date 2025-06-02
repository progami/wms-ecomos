-- Update existing roles to new simplified system
UPDATE "User" SET "role" = 'admin' WHERE "role" = 'system_admin';
UPDATE "User" SET "role" = 'staff' WHERE "role" IN ('warehouse_staff', 'finance_admin', 'manager', 'viewer');

-- Update the enum values in PostgreSQL
-- Note: This requires careful handling as PostgreSQL doesn't allow direct enum modification
-- You may need to run these commands manually or adjust based on your database setup

-- Step 1: Create new enum type
-- CREATE TYPE "UserRole_new" AS ENUM ('admin', 'staff');

-- Step 2: Update column to use new enum
-- ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");

-- Step 3: Drop old enum type
-- DROP TYPE "UserRole";

-- Step 4: Rename new enum to original name
-- ALTER TYPE "UserRole_new" RENAME TO "UserRole";