# WMS Infrastructure

This directory contains all infrastructure and deployment code for the WMS application.

## Directory Structure

```
infrastructure/
├── deploy/              # Deployment scripts
│   ├── deploy.sh       # Main deployment script
│   ├── check-status.sh # Status checking script
│   └── README.md       # Deployment documentation
├── terraform/          # Infrastructure as Code
│   ├── environments/   # Environment-specific configs
│   │   └── prod/      # Production environment
│   └── modules/       # Reusable Terraform modules
├── ansible/           # Configuration management (optional)
└── Makefile          # Convenient commands
```

## Quick Start

### Prerequisites
- AWS CLI installed and configured
- Terraform installed
- AWS account with appropriate permissions

### Deploy WMS

```bash
# Deploy everything (infrastructure + application)
make deploy

# Check deployment status
make check-status

# Access the application
# URL will be shown after deployment completes
```

### Other Commands

```bash
# Preview infrastructure changes
make plan

# SSH into EC2 instance
make ssh

# View application logs
make logs

# Destroy all resources (stop AWS charges)
make destroy
```

## Infrastructure Details

- **EC2**: t2.micro instance (free tier eligible)
- **Database**: PostgreSQL running on EC2
- **Web Server**: Nginx reverse proxy
- **Process Manager**: PM2 for Node.js
- **Storage**: 30GB EBS volume
- **Optional**: S3 bucket for file uploads

## Costs

- **Free Tier**: $0/month for first 12 months
- **After Free Tier**: ~$11.50/month

## Security

- SSH access restricted to your IP
- All other ports open for web traffic
- Passwords auto-generated during deployment

## Support

For deployment issues, check:
1. AWS credentials: `aws configure list`
2. Terraform state: `cd terraform/environments/prod && terraform show`
3. Application logs: `make logs`