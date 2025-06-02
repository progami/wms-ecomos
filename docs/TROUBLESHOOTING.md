# Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Authentication Issues

#### "Unauthorized" Error
**Symptoms**: Getting 401 errors or redirected to login
**Solutions**:
1. Clear browser cookies and cache
2. Login again with correct credentials
3. Check if user account is active in database
4. Verify user has correct role (admin or staff)

#### Can't Access Admin Pages
**Symptoms**: Redirected away from admin pages
**Solutions**:
1. Ensure logged in as admin@warehouse.com
2. Check user role in database is 'admin'
3. Clear session and login again

### API Errors

#### Finance Dashboard Not Loading
**Problem**: Finance dashboard shows error or empty
**Fixed**: API endpoint was calling `/api/finance/dashboard-simple` which doesn't exist
**Solution**: Now correctly calls `/api/finance/dashboard`

#### Admin Dashboard Failing
**Problem**: Admin dashboard not loading data
**Fixed**: Was calling non-existent `/api/admin/dashboard-simple`
**Solution**: Now correctly calls `/api/admin/dashboard`

#### SKU List Not Loading
**Problem**: SKU settings page shows error
**Fixed**: Was calling `/api/skus-simple` instead of `/api/skus`
**Solution**: Now uses correct endpoint

### Data Issues

#### Inventory Balances Show Zero
**Solutions**:
1. Run "Inventory Balance" calculation from Admin > Run Calculations
2. Check if transactions exist in the system
3. Verify transaction dates are not in future

#### Missing Transactions
**Solutions**:
1. Check date filters aren't too restrictive
2. For staff users, verify warehouse assignment
3. Run database query to confirm data exists

#### Storage Costs Not Calculating
**Solutions**:
1. Ensure cost rates are configured for the warehouse
2. Check SKU warehouse configurations exist
3. Run "Storage Ledger" calculation for the billing period

### Navigation Issues

#### Can't Find Receive/Ship Options
**Location**: These are now buttons on the Inventory Ledger page
**Path**: Go to Inventory Ledger, look for green "Receive Goods" and red "Ship Goods" buttons

#### Missing Menu Items
**For Staff**: Settings is now available in staff navigation
**For Admin**: Inventory Overview has been removed (use Inventory Ledger instead)

### Performance Issues

#### Slow Page Loading
**Solutions**:
1. Check database connection
2. Reduce date range for queries
3. Use filters to limit data
4. Check browser console for errors

#### Export Taking Too Long
**Solutions**:
1. Reduce date range
2. Apply filters before exporting
3. Try exporting in smaller batches

## 🔧 Database Queries for Debugging

### Check User Roles
```sql
SELECT email, role, "isActive" FROM users ORDER BY role;
```

### Verify Transactions Exist
```sql
SELECT COUNT(*) FROM inventory_transactions;
SELECT * FROM inventory_transactions ORDER BY "transactionDate" DESC LIMIT 10;
```

### Check Inventory Balances
```sql
SELECT w.name, s."skuCode", ib."batchLot", ib."currentCartons"
FROM inventory_balances ib
JOIN warehouses w ON ib."warehouseId" = w.id
JOIN skus s ON ib."skuId" = s.id
WHERE ib."currentCartons" > 0;
```

### Verify Cost Rates
```sql
SELECT w.name, cr."costName", cr."costValue", cr."effectiveDate"
FROM cost_rates cr
JOIN warehouses w ON cr."warehouseId" = w.id
ORDER BY w.name, cr."effectiveDate" DESC;
```

## 📝 Logging and Debugging

### Enable Debug Mode
Add to your `.env` file:
```env
DEBUG=true
LOG_LEVEL=debug
```

### Check Browser Console
1. Open Developer Tools (F12)
2. Check Console tab for errors
3. Check Network tab for failed API calls
4. Look for 404 or 500 errors

### Server Logs
If self-hosting, check:
1. Application logs
2. PostgreSQL logs
3. Web server logs

## 🆘 Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Try in incognito/private browser mode
4. Collect error messages and screenshots

### Information to Provide
- User email and role
- Page URL where error occurs
- Exact error message
- Browser console errors
- Steps to reproduce
- Screenshots if applicable

### Contact Channels
1. GitHub Issues: For bugs and feature requests
2. System Admin: For urgent production issues
3. Documentation: Check `/docs` folder first