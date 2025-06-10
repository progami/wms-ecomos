# UI Elements Inventory - Warehouse Management App

## 1. Authentication Pages

### `/auth/login` - Login Page
**File:** `src/app/auth/login/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Email/Username Input | Text Input | `input[name="emailOrUsername"]` | Fill & Validate |
| Password Input | Password Input | `input[name="password"]` | Fill & Validate |
| Sign In Button | Submit Button | `button[type="submit"]` | Click & Navigate |

## 2. Main Navigation

### Main Navigation Component
**File:** `src/components/layout/main-nav.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Dashboard Link | Nav Link | `a[href="/dashboard"]` or `a[href="/admin/dashboard"]` | Click & Navigate |
| Operations Menu | Dropdown | `button:has-text("Operations")` | Click & Expand |
| - Shipment Planning | Nav Link | `a[href="/operations/shipment-planning"]` | Click & Navigate |
| - Inventory Ledger | Nav Link | `a[href="/operations/inventory"]` | Click & Navigate |
| - Receive Goods | Nav Link | `a[href="/operations/receive"]` | Click & Navigate |
| - Ship Goods | Nav Link | `a[href="/operations/ship"]` | Click & Navigate |
| - Import Attributes | Nav Link | `a[href="/operations/import-attributes"]` | Click & Navigate |
| - Pallet Variance | Nav Link | `a[href="/operations/pallet-variance"]` | Click & Navigate |
| Finance Menu | Dropdown | `button:has-text("Finance")` | Click & Expand |
| - Finance Dashboard | Nav Link | `a[href="/finance/dashboard"]` | Click & Navigate |
| - Invoices | Nav Link | `a[href="/finance/invoices"]` | Click & Navigate |
| - Reconciliation | Nav Link | `a[href="/finance/reconciliation"]` | Click & Navigate |
| - Storage Ledger | Nav Link | `a[href="/finance/storage-ledger"]` | Click & Navigate |
| - Cost Ledger | Nav Link | `a[href="/finance/cost-ledger"]` | Click & Navigate |
| Configuration Menu | Dropdown | `button:has-text("Configuration")` | Click & Expand |
| - Products (SKUs) | Nav Link | `a[href="/config/products"]` | Click & Navigate |
| - Batch Attributes | Nav Link | `a[href="/config/batch-attributes"]` | Click & Navigate |
| - Locations | Nav Link | `a[href="/config/locations"]` | Click & Navigate |
| - Cost Rates | Nav Link | `a[href="/config/rates"]` | Click & Navigate |
| - Invoice Templates | Nav Link | `a[href="/config/invoice-templates"]` | Click & Navigate |
| - Warehouse Configs | Nav Link | `a[href="/config/warehouse-configs"]` | Click & Navigate |
| Analytics Menu | Dropdown | `button:has-text("Analytics")` | Click & Expand |
| - Reports | Nav Link | `a[href="/reports"]` | Click & Navigate |
| - Analytics | Nav Link | `a[href="/analytics"]` | Click & Navigate |
| Integrations Menu | Dropdown | `button:has-text("Integrations")` | Click & Expand |
| - Amazon FBA | Nav Link | `a[href="/integrations/amazon"]` | Click & Navigate |
| Admin Menu | Dropdown | `button:has-text("Admin")` | Click & Expand |
| - Users | Nav Link | `a[href="/admin/users"]` | Click & Navigate |
| - Settings | Nav Link | `a[href="/admin/settings"]` | Click & Navigate |
| - Import Excel | Nav Link | `a[href="/admin/import-excel"]` | Click & Navigate |
| Sign Out Button | Button | `button:has-text("Sign out")` | Click & Logout |
| Mobile Menu Toggle | Button | `button[aria-label="Open menu"]` | Click & Toggle |
| Mobile Menu Close | Button | `button[aria-label="Close menu"]` | Click & Toggle |

## 3. Dashboard Pages

### `/dashboard` - Staff Dashboard
**File:** `src/app/dashboard/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Manage Inventory Card | Link Card | `a[href="/operations/inventory"]` | Click & Navigate |
| Receive Shipments Card | Link Card | `a[href="/operations/receive"]` | Click & Navigate |
| Ship Orders Card | Link Card | `a[href="/operations/ship"]` | Click & Navigate |
| Process Invoices Card | Link Card | `a[href="/finance/invoices"]` | Click & Navigate |
| Cost Rates Card | Link Card | `a[href="/config/rates"]` | Click & Navigate |
| Reconciliation Card | Link Card | `a[href="/finance/reconciliation"]` | Click & Navigate |
| Generate Reports Card | Link Card | `a[href="/reports"]` | Click & Navigate |

### `/admin/dashboard` - Admin Dashboard
**File:** `src/app/admin/dashboard/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Time Range Selector | Dropdown | `button:has-text("Current Month")` | Click & Select |
| Auto-refresh Toggle | Toggle | `button[aria-label="Toggle auto-refresh"]` | Click & Toggle |
| Manual Refresh | Button | `button[aria-label="Refresh data"]` | Click & Refresh |
| Export All Data | Button | `button:has-text("Export All Data")` | Click & Download |
| Import Data | Button | `button:has-text("Import Data")` | Click & Modal |
| Database Backup | Button | `button:has-text("Database Backup")` | Click & Action |
| Generate Reports | Button | `button:has-text("Generate Reports")` | Click & Navigate |
| System Health | Button | `button:has-text("System Health")` | Click & Modal |
| Notifications | Button | `button:has-text("Notifications")` | Click & Navigate |
| Weekly/Monthly Toggle | Toggle | `button:has-text("Weekly")`, `button:has-text("Monthly")` | Click & Switch |

## 4. Operations - Receive Goods

### `/operations/receive` - Receive Goods Form
**File:** `src/app/operations/receive/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Commercial Invoice # | Text Input | `input[name="ciNumber"]` | Fill & Validate |
| Packing List # | Text Input | `input[name="packingListNumber"]` | Fill & Validate |
| TC # GRS | Text Input | `input[name="tcNumber"]` | Fill & Validate |
| Supplier | Text Input | `input[name="supplier"]` | Fill & Validate |
| Receipt Date | Date Input | `input[name="date"]` | Date Selection |
| Pickup Date | Date Input | `input[name="pickupDate"]` | Date Selection |
| Ship Name | Text Input | `input[name="shipName"]` | Fill & Validate |
| Container Number | Text Input | `input[name="containerNumber"]` | Fill & Validate |
| Notes | Textarea | `textarea[name="notes"]` | Fill & Validate |
| Add Item Button | Button | `button:has-text("Add Item")` | Click & Add Row |
| SKU Code Select | Select | `select[name="items[0].skuId"]` | Select Option |
| Batch/Lot Input | Text Input | `input[name="items[0].batchLot"]` | Auto-populated |
| Cartons Input | Number Input | `input[name="items[0].cartons"]` | Fill & Calculate |
| Units/Carton Input | Number Input | `input[name="items[0].unitsPerCarton"]` | Fill & Calculate |
| Storage Cartons/Pallet | Number Input | `input[name="items[0].storageCartonsPerPallet"]` | Fill & Validate |
| Shipping Cartons/Pallet | Number Input | `input[name="items[0].shippingCartonsPerPallet"]` | Fill & Validate |
| Pallets Input | Number Input | `input[name="items[0].pallets"]` | Fill & Calculate |
| Remove Item Button | Button | `button[aria-label="Remove item"]` | Click & Remove |
| Commercial Invoice Upload | File Input | `input[accept*="pdf"][data-category="commercialInvoice"]` | File Upload |
| Bill of Lading Upload | File Input | `input[accept*="pdf"][data-category="billOfLading"]` | File Upload |
| Packing List Upload | File Input | `input[accept*="pdf"][data-category="packingList"]` | File Upload |
| Delivery Note Upload | File Input | `input[accept*="pdf"][data-category="deliveryNote"]` | File Upload |
| Cube Master Upload | File Input | `input[accept*="pdf"][data-category="cubeMaster"]` | File Upload |
| TC GRS Upload | File Input | `input[accept*="pdf"][data-category="transactionCertificate"]` | File Upload |
| Custom Declaration Upload | File Input | `input[accept*="pdf"][data-category="customDeclaration"]` | File Upload |
| Additional Docs Upload | File Input | `input[multiple][accept*="pdf"]` | Multiple Files |
| Cancel Button | Button | `button:has-text("Cancel")` | Click & Navigate |
| Save Receipt Button | Submit Button | `button[type="submit"]:has-text("Save Receipt")` | Submit Form |

## 5. Operations - Ship Goods

### `/operations/ship` - Ship Goods Form
**File:** `src/app/operations/ship/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Order Number | Text Input | `input[name="orderNumber"]` | Fill & Validate |
| Shipment Date | Date Input | `input[name="date"]` | Date Selection |
| Pickup Date | Date Input | `input[name="pickupDate"]` | Date Selection |
| Mode of Transportation | Select | `select[name="modeOfTransportation"]` | Select Option |
| Carrier | Select | `select[name="carrier"]` | Select Option |
| FBA Tracking ID | Text Input | `input[name="fbaTrackingId"]` | Fill & Validate |
| Notes | Textarea | `textarea[name="notes"]` | Fill & Validate |
| Add Item Button | Button | `button:has-text("Add Item")` | Click & Add Row |
| SKU Select | Select | `select[name="items[0].skuId"]` | Select Option |
| Batch/Lot Input | Text Input | `input[name="items[0].batchLot"]` | Fill & Validate |
| Cartons Input | Number Input | `input[name="items[0].cartons"]` | Fill & Calculate |
| Pallets Input | Number Input | `input[name="items[0].pallets"]` | Fill & Calculate |
| Remove Item Button | Button | `button[aria-label="Remove item"]` | Click & Remove |
| Proof of Pickup Upload | File Input | `input[accept*="pdf"][data-category="proofOfPickup"]` | File Upload |
| Cancel Button | Button | `button:has-text("Cancel")` | Click & Navigate |
| Save Shipment Button | Submit Button | `button[type="submit"]:has-text("Save Shipment")` | Submit Form |

## 6. Operations - Inventory Ledger

### `/operations/inventory` - Inventory Management
**File:** `src/app/operations/inventory/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Search Bar | Text Input | `input[placeholder*="Search"]` | Search & Filter |
| Filter Button | Button | `button:has-text("Filters")` | Click & Toggle |
| Warehouse Filter | Select | `select[aria-label="Warehouse filter"]` | Select Option |
| Transaction Type Filter | Select | `select[aria-label="Transaction type filter"]` | Select Option |
| End Date Filter | Date Input | `input[type="date"][aria-label="End date filter"]` | Date Selection |
| Show Incomplete | Checkbox | `input[type="checkbox"][id="showIncomplete"]` | Check & Filter |
| Clear Filters | Button | `button:has-text("Clear all filters")` | Click & Reset |
| Export Button | Button | `button:has-text("Export")` | Click & Download |
| Receive Goods Button | Link Button | `a:has-text("Receive Goods")` | Click & Navigate |
| Ship Goods Button | Link Button | `a:has-text("Ship Goods")` | Click & Navigate |
| Balances Tab | Tab Button | `button[role="tab"]:has-text("Current Balances")` | Click & Switch |
| Transactions Tab | Tab Button | `button[role="tab"]:has-text("Inventory Ledger")` | Click & Switch |
| Sort Date Column | Button | `button:has-text("Creation Date")` | Click & Sort |
| Transaction Row | Table Row | `tr[onclick]` | Click & Navigate |
| Ledger Info Tooltip | Info Icon | `svg.lucide-info` | Hover & Show |

## 7. Operations - Transaction Detail

### `/operations/transactions/[id]` - Transaction Detail Page
**File:** `src/app/operations/transactions/[id]/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Back to Inventory | Button | `button:has-text("Back to Inventory")` | Click & Navigate |
| Audit Log Button | Button | `button:has-text("Audit Log")` | Click & Toggle |
| Edit Button | Button | `button:has-text("Edit")` | Click & Edit Mode |
| Save Changes Button | Button | `button:has-text("Save Changes")` | Save & Validate |
| Cancel Edit Button | Button | `button:has-text("Cancel")` | Click & Reset |
| Reference ID Input | Text Input | `input[value*="referenceId"]` | Fill (Edit Mode) |
| Notes Textarea | Textarea | `textarea[value*="notes"]` | Fill (Edit Mode) |
| Cartons Input | Number Input | `input[aria-label="Cartons"]` | Fill (Edit Mode) |
| Pallets Input | Number Input | `input[aria-label="Pallets"]` | Fill (Edit Mode) |
| File Upload Areas | File Input | `input[type="file"]` | Upload (Edit Mode) |
| Remove File Buttons | Button | `button[aria-label="Remove file"]` | Click & Remove |

## 8. Finance - Invoices

### `/finance/invoices` - Invoice Management
**File:** `src/app/finance/invoices/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Export Button | Button | `button:has-text("Export")` | Click & Download |
| New Invoice Button | Link Button | `a:has-text("New Invoice")` | Click & Navigate |
| Search Input | Text Input | `input[placeholder*="Search"]` | Search & Filter |
| Warehouse Filter | Select | `select[aria-label="Warehouse filter"]` | Select Option |
| Status Filter | Select | `select[aria-label="Status filter"]` | Select Option |
| View Invoice Button | Button | `button:has-text("View")` | Click & Navigate |
| Process Button | Button | `button:has-text("Process")` | Click & Action |
| Accept Button | Button | `button:has-text("Accept")` | Click & Action |
| Dispute Button | Button | `button:has-text("Dispute")` | Click & Modal |
| Previous Page | Button | `button:has-text("Previous")` | Click & Paginate |
| Next Page | Button | `button:has-text("Next")` | Click & Paginate |

### `/finance/invoices/new` - Create Invoice
**File:** `src/app/finance/invoices/new/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Invoice Number | Text Input | `input[name="invoiceNumber"]` | Fill & Validate |
| Warehouse Select | Select | `select[name="warehouseId"]` | Select Option |
| Period Start | Date Input | `input[name="periodStart"]` | Date Selection |
| Period End | Date Input | `input[name="periodEnd"]` | Date Selection |
| Due Date | Date Input | `input[name="dueDate"]` | Date Selection |
| Add Line Item | Button | `button:has-text("Add Line Item")` | Click & Add Row |
| Service Type Select | Select | `select[name="lineItems[0].serviceType"]` | Select Option |
| Description Input | Text Input | `input[name="lineItems[0].description"]` | Fill & Validate |
| Quantity Input | Number Input | `input[name="lineItems[0].quantity"]` | Fill & Calculate |
| Rate Input | Number Input | `input[name="lineItems[0].rate"]` | Fill & Calculate |
| Remove Line Button | Button | `button[aria-label="Remove line item"]` | Click & Remove |
| Notes Textarea | Textarea | `textarea[name="notes"]` | Fill & Validate |
| Cancel Button | Button | `button:has-text("Cancel")` | Click & Navigate |
| Create Invoice Button | Submit Button | `button[type="submit"]:has-text("Create Invoice")` | Submit Form |

## 9. Finance - Storage Ledger

### `/finance/storage-ledger` - Storage Ledger
**File:** `src/app/finance/storage-ledger/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Year/Month Selector | Select | `select[aria-label="Period selector"]` | Select Option |
| Warehouse Filter | Select | `select[aria-label="Warehouse filter"]` | Select Option |
| Export Button | Button | `button:has-text("Export")` | Click & Download |
| Refresh Button | Button | `button[aria-label="Refresh"]` | Click & Reload |
| Ledger Tab | Tab Button | `button[role="tab"]:has-text("Storage Ledger")` | Click & Switch |

## 10. Configuration - Products

### `/config/products` - SKU Management
**File:** `src/app/config/products/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Add SKU Button | Link Button | `a:has-text("Add SKU")` | Click & Navigate |
| Search Input | Text Input | `input[placeholder*="Search"]` | Search & Filter |
| Show Inactive | Checkbox | `input[type="checkbox"][id="showInactive"]` | Check & Filter |
| Edit SKU Button | Button | `button:has-text("Edit")` | Click & Navigate |
| Delete SKU Button | Button | `button:has-text("Delete")` | Click & Confirm |
| Activate/Deactivate | Button | `button:has-text("Activate")`, `button:has-text("Deactivate")` | Click & Toggle |

### `/config/products/new` - Create/Edit SKU
**File:** `src/app/config/products/new/page.tsx`, `src/app/config/products/[id]/edit/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| SKU Code Input | Text Input | `input[name="skuCode"]` | Fill & Validate |
| Description Input | Text Input | `input[name="description"]` | Fill & Validate |
| ASIN Input | Text Input | `input[name="asin"]` | Fill & Validate |
| Pack Size Input | Number Input | `input[name="packSize"]` | Fill & Validate |
| Material Input | Text Input | `input[name="material"]` | Fill & Validate |
| Units per Carton | Number Input | `input[name="unitsPerCarton"]` | Fill & Validate |
| Carton Weight | Number Input | `input[name="cartonWeight"]` | Fill & Validate |
| Length Input | Number Input | `input[name="length"]` | Fill & Validate |
| Width Input | Number Input | `input[name="width"]` | Fill & Validate |
| Height Input | Number Input | `input[name="height"]` | Fill & Validate |
| Packaging Type | Select | `select[name="packagingType"]` | Select Option |
| Active Checkbox | Checkbox | `input[type="checkbox"][name="isActive"]` | Check & Toggle |
| Cancel Button | Button | `button:has-text("Cancel")` | Click & Navigate |
| Save SKU Button | Submit Button | `button[type="submit"]:has-text("Save")` | Submit Form |

## 11. Configuration - Cost Rates

### `/config/rates` - Cost Rate Management
**File:** `src/app/config/rates/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Add Rate Button | Link Button | `a:has-text("Add Rate")` | Click & Navigate |
| Rate Type Filter | Select | `select[aria-label="Rate type filter"]` | Select Option |
| Edit Rate Button | Button | `button:has-text("Edit")` | Click & Navigate |
| Delete Rate Button | Button | `button:has-text("Delete")` | Click & Confirm |

### `/config/rates/new` - Create/Edit Rate
**File:** `src/app/config/rates/new/page.tsx`, `src/app/config/rates/[id]/edit/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Rate Type Select | Select | `select[name="rateType"]` | Select Option |
| Description Input | Text Input | `input[name="description"]` | Fill & Validate |
| Base Rate Input | Number Input | `input[name="baseRate"]` | Fill & Validate |
| Effective Date | Date Input | `input[name="effectiveDate"]` | Date Selection |
| End Date | Date Input | `input[name="endDate"]` | Date Selection |
| Min Quantity | Number Input | `input[name="minQuantity"]` | Fill & Validate |
| Max Quantity | Number Input | `input[name="maxQuantity"]` | Fill & Validate |
| Cancel Button | Button | `button:has-text("Cancel")` | Click & Navigate |
| Save Rate Button | Submit Button | `button[type="submit"]:has-text("Save")` | Submit Form |

## 12. Reports

### `/reports` - Report Generator
**File:** `src/app/reports/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Report Type Select | Select | `select[name="reportType"]` | Select Option |
| Date Range Start | Date Input | `input[name="startDate"]` | Date Selection |
| Date Range End | Date Input | `input[name="endDate"]` | Date Selection |
| Warehouse Select | Multi-Select | `select[name="warehouses"]` | Multi-Select |
| SKU Select | Multi-Select | `select[name="skus"]` | Multi-Select |
| Generate Report | Button | `button:has-text("Generate Report")` | Click & Generate |
| Export Button | Button | `button:has-text("Export")` | Click & Download |
| Print Button | Button | `button:has-text("Print")` | Click & Print |

## 13. Admin - Users

### `/admin/users` - User Management
**File:** `src/app/admin/users/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Add User Button | Button | `button:has-text("Add User")` | Click & Modal |
| Search Users | Text Input | `input[placeholder*="Search users"]` | Search & Filter |
| Role Filter | Select | `select[aria-label="Role filter"]` | Select Option |
| Edit User Button | Button | `button:has-text("Edit")` | Click & Modal |
| Delete User Button | Button | `button:has-text("Delete")` | Click & Confirm |
| Reset Password | Button | `button:has-text("Reset Password")` | Click & Action |
| Toggle Active | Switch | `button[role="switch"]` | Click & Toggle |

## 14. Admin - Settings

### `/admin/settings` - Settings Hub
**File:** `src/app/admin/settings/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| General Settings Card | Link Card | `a[href="/admin/settings/general"]` | Click & Navigate |
| Security Settings Card | Link Card | `a[href="/admin/settings/security"]` | Click & Navigate |
| Database Settings Card | Link Card | `a[href="/admin/settings/database"]` | Click & Navigate |
| Notification Settings Card | Link Card | `a[href="/admin/settings/notifications"]` | Click & Navigate |

### `/admin/settings/general` - General Settings
**File:** `src/app/admin/settings/general/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Company Name | Text Input | `input[name="companyName"]` | Fill & Validate |
| Time Zone Select | Select | `select[name="timezone"]` | Select Option |
| Date Format Select | Select | `select[name="dateFormat"]` | Select Option |
| Currency Select | Select | `select[name="currency"]` | Select Option |
| Save Settings Button | Submit Button | `button[type="submit"]:has-text("Save")` | Submit Form |

### `/admin/settings/security` - Security Settings
**File:** `src/app/admin/settings/security/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Min Password Length | Number Input | `input[name="minPasswordLength"]` | Fill & Validate |
| Require Uppercase | Checkbox | `input[name="requireUppercase"]` | Check & Toggle |
| Require Numbers | Checkbox | `input[name="requireNumbers"]` | Check & Toggle |
| Require Symbols | Checkbox | `input[name="requireSymbols"]` | Check & Toggle |
| Session Timeout | Number Input | `input[name="sessionTimeout"]` | Fill & Validate |
| Save Settings Button | Submit Button | `button[type="submit"]:has-text("Save")` | Submit Form |

### `/admin/settings/notifications` - Notification Settings
**File:** `src/app/admin/settings/notifications/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| SMTP Host | Text Input | `input[name="smtpHost"]` | Fill & Validate |
| SMTP Port | Number Input | `input[name="smtpPort"]` | Fill & Validate |
| SMTP User | Text Input | `input[name="smtpUser"]` | Fill & Validate |
| SMTP Password | Password Input | `input[name="smtpPassword"]` | Fill & Validate |
| Test Email Button | Button | `button:has-text("Send Test Email")` | Click & Test |
| Save Settings Button | Submit Button | `button[type="submit"]:has-text("Save")` | Submit Form |

## 15. Common UI Components

### Confirm Dialog
**File:** `src/components/ui/confirm-dialog.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Confirm Button | Button | `button:has-text("Confirm")` | Click & Action |
| Cancel Button | Button | `button:has-text("Cancel")` | Click & Close |
| Close X Button | Button | `button[aria-label="Close"]` | Click & Close |

### Toast Notifications

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Toast Close Button | Button | `button[aria-label="Close notification"]` | Click & Dismiss |

### Pagination Controls

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| First Page | Button | `button[aria-label="First page"]` | Click & Navigate |
| Previous Page | Button | `button[aria-label="Previous page"]` | Click & Navigate |
| Next Page | Button | `button[aria-label="Next page"]` | Click & Navigate |
| Last Page | Button | `button[aria-label="Last page"]` | Click & Navigate |
| Page Number | Button | `button[aria-label*="Page"]` | Click & Navigate |

### Table Controls

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Sort Column Header | Button | `th[aria-sort]` | Click & Sort |
| Select All Checkbox | Checkbox | `input[aria-label="Select all"]` | Check & Select |
| Row Checkbox | Checkbox | `input[aria-label*="Select row"]` | Check & Select |

## 16. Integration - Amazon FBA

### `/integrations/amazon` - Amazon FBA Integration
**File:** `src/app/integrations/amazon/page.tsx`

| Element | Type | Selector | Test Type |
|---------|------|----------|-----------|
| Sync Now Button | Button | `button:has-text("Sync Now")` | Click & Sync |
| Setup Warehouse Button | Button | `button:has-text("Setup Amazon FBA Warehouse")` | Click & Action |
| Auto-sync Toggle | Switch | `input[name="autoSync"]` | Toggle & Save |
| Sync Interval Select | Select | `select[name="syncInterval"]` | Select Option |
| Save Settings Button | Submit Button | `button[type="submit"]:has-text("Save")` | Submit Form |

## Test Types Legend:
- **Click & Navigate**: Click element and verify navigation to new page
- **Click & Action**: Click element and verify action completed (API call, state change)
- **Click & Toggle**: Click element and verify toggle state change
- **Click & Modal**: Click element and verify modal opens
- **Click & Confirm**: Click element and verify confirmation dialog
- **Fill & Validate**: Fill input and verify validation
- **Fill & Calculate**: Fill input and verify calculated values update
- **Select Option**: Select dropdown option and verify selection
- **Date Selection**: Select date and verify format/validation
- **File Upload**: Upload file and verify acceptance
- **Search & Filter**: Type search query and verify results filter
- **Submit Form**: Submit form and verify success/error handling
- **Hover & Show**: Hover element and verify tooltip/popover
- **Check & Toggle**: Check/uncheck and verify state change
- **Multi-Select**: Select multiple options and verify
- **Drag & Drop**: Drag file to area and verify upload