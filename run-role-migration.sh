#!/bin/bash

echo "Running role simplification migration..."

# Generate Prisma client with new schema
echo "1. Generating Prisma client..."
npx prisma generate

# Run the SQL migration to update existing roles
echo "2. Updating existing user roles in database..."
npx prisma db execute --file ./prisma/migrations/update_user_roles.sql --schema ./prisma/schema.prisma

# Run seed to create new users
echo "3. Running seed to create Hashar and Umair users..."
npx prisma db seed

echo "Migration complete! The system now uses simplified roles:"
echo "- admin: Full system access"
echo "- staff: Access to all operational and finance functions"
echo ""
echo "New staff users created:"
echo "- hashar@warehouse.com (Finance Manager)"
echo "- umair@warehouse.com (Operations Manager)"
echo ""
echo "Default password for all users: staff123"