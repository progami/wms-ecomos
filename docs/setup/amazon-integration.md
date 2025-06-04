# Amazon FBA Integration Setup

## Overview

The Amazon FBA integration allows you to sync inventory data between Amazon FBA and your warehouse management system. The integration page is only available to admin users.

## Required Credentials

To enable live data syncing from Amazon FBA, you need to configure the following environment variables in your `.env.local` file:

```bash
# Amazon Seller API Configuration
AMAZON_SP_APP_ID="your-app-id-here"
AMAZON_REFRESH_TOKEN="your-refresh-token-here"
AMAZON_MARKETPLACE_ID="A1F83G8C2ARO7P"  # UK marketplace
AMAZON_REGION="eu-west-1"  # Europe region

# From your Amazon Seller Central app registration:
AMAZON_SP_APP_CLIENT_ID="your-client-id-here"
AMAZON_SP_APP_CLIENT_SECRET="your-client-secret-here"
```

**Important**: Never commit these credentials to git. The `.env.local` file is already in `.gitignore`.

## Getting Your Credentials

1. **App ID**: Obtained when you register your application in Amazon Seller Central
2. **Refresh Token**: Generated after authorizing your app
3. **Client ID & Secret**: Found in your Amazon app details in Seller Central

## Features

### Current Functionality

1. **View Inventory Comparison**: See inventory levels across warehouse and Amazon FBA
2. **Sync to Database**: Manually sync Amazon FBA quantities to the local database
3. **Automatic Rate Setup**: The system automatically creates seasonal storage rates for Amazon FBA

### Storage Rates

Amazon FBA uses cubic feet for storage calculations with seasonal rates:

- **Jan-Sep**: £0.75/cubic foot/month (standard), £0.53/cubic foot/month (oversize)
- **Oct-Dec**: £2.40/cubic foot/month (standard), £1.65/cubic foot/month (oversize)

These rates are automatically created when you first use the sync feature.

## Usage

1. Navigate to **Admin > System > Amazon Integration**
2. Click **Refresh Data** to load current inventory comparison
3. Click **Sync to Database** to update Amazon FBA quantities in the system

## Technical Details

- Amazon inventory is stored with batch lot format: `AMZN-{year}`
- The warehouse code is `AMZN-UK`
- Storage calculations use cubic feet instead of pallets
- The integration is isolated from the main warehouse operations