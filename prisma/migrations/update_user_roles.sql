-- Update existing user roles to new simplified roles
UPDATE "users" 
SET role = 'admin' 
WHERE role IN ('system_admin');

UPDATE "users" 
SET role = 'staff' 
WHERE role IN ('warehouse_staff', 'finance_admin', 'manager', 'viewer');