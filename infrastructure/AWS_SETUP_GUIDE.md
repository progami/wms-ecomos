# AWS Setup Guide for WMS Deployment

## Prerequisites

1. **AWS Account** - Sign up at https://aws.amazon.com if you don't have one
2. **IAM User with Permissions** - You need programmatic access

## Step 1: Create IAM User

1. Go to AWS Console: https://console.aws.amazon.com
2. Navigate to **IAM** (Identity and Access Management)
3. Click **Users** → **Add User**
4. User name: `wms-deployer`
5. Select **Access key - Programmatic access**
6. Click **Next: Permissions**

## Step 2: Set Permissions

Choose one of these options:

### Option A: Admin Access (Easiest for testing)
- Select **Attach existing policies directly**
- Search and select: `AdministratorAccess`
- Click **Next**

### Option B: Minimal Permissions (More secure)
- Select **Attach existing policies directly**
- Select these policies:
  - `AmazonEC2FullAccess`
  - `AmazonVPCFullAccess`
  - `IAMReadOnlyAccess`

## Step 3: Get Access Keys

1. Complete user creation
2. **IMPORTANT**: Save the **Access Key ID** and **Secret Access Key**
3. You won't be able to see the secret key again!

## Step 4: Configure AWS CLI

Run this command and enter your credentials:
```bash
aws configure
```

Enter:
- AWS Access Key ID: [your-access-key]
- AWS Secret Access Key: [your-secret-key]
- Default region name: us-east-1
- Default output format: json

## Step 5: Deploy WMS

```bash
cd /Users/jarraramjad/Documents/ecom_os/WMS/infrastructure
./deploy-local.sh
```

## Estimated Costs (AWS Free Tier)

- **t3.micro EC2**: Free for 750 hours/month (first year)
- **Storage**: 30 GB free
- **Data Transfer**: 15 GB free
- **Total**: $0/month if within free tier limits

## After Free Tier
- t3.micro: ~$8.50/month
- Storage: ~$3/month
- Total: ~$12/month

## Security Notes

1. The deployment creates a security group that allows:
   - SSH (port 22) from your IP only
   - HTTP (port 80) from anywhere
   - HTTPS (port 443) from anywhere

2. Credentials are auto-generated and shown after deployment

3. Remember to destroy resources when not needed:
   ```bash
   cd infrastructure
   make destroy-prod
   ```