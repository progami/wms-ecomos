# WMS Infrastructure Deployment Guide

This guide explains how to deploy the WMS application using the new Terraform and Ansible based infrastructure.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** (>= 1.0) installed
3. **Ansible** (>= 2.9) installed
4. **AWS CLI** configured with credentials
5. **SSH Key Pair** for EC2 access

## Quick Start

### 1. Generate SSH Key (if needed)
```bash
cd infrastructure
make generate-key-prod
```

### 2. Configure Terraform Variables
Create `infrastructure/terraform/environments/prod/terraform.tfvars`:
```hcl
aws_region = "us-east-1"
public_key = "ssh-rsa AAAAB3... your-public-key"
ssh_allowed_ips = ["YOUR_IP/32"]
```

### 3. Deploy Infrastructure and Application
```bash
cd infrastructure
make deploy-prod GIT_REPO=https://github.com/your-org/wms.git
```

## Deployment Options

### Infrastructure Only
```bash
make apply-prod
```

### Application Deployment Only
```bash
cd infrastructure/ansible
ansible-playbook -i inventory/prod.yml playbooks/deploy.yml
```

### Plan Changes
```bash
make plan-prod
```

## Architecture Options

### Basic Setup (Single EC2 + Local PostgreSQL)
- Cost-effective for small deployments
- PostgreSQL runs on the same EC2 instance
- Default configuration

### Production Setup (ALB + RDS)
Add to `terraform.tfvars`:
```hcl
use_alb = true
use_rds = true
instance_count = 2
rds_instance_class = "db.t3.small"
```

### High Availability Setup
```hcl
use_alb = true
use_rds = true
instance_count = 3
enable_nat_gateway = true
use_private_subnets = true
```

## Management Commands

### SSH Access
```bash
make ssh-prod
```

### View Logs
```bash
make logs-prod
```

### Application Status
```bash
make status-prod
```

### Backup Database
```bash
cd infrastructure/ansible
ansible-playbook -i inventory/prod.yml playbooks/backup.yml
```

### Rollback Deployment
```bash
cd infrastructure/ansible
ansible-playbook -i inventory/prod.yml playbooks/rollback.yml -e "git_commit=COMMIT_HASH"
```

## Environment Variables

Set in Ansible group_vars or pass via command line:

- `database_password`: PostgreSQL password (auto-generated if not set)
- `admin_password`: Admin user password
- `staff_password`: Staff user password
- `nextauth_secret`: NextAuth secret (auto-generated)
- `amazon_sp_app_id`: Amazon integration (optional)
- `google_maps_api_key`: Google Maps API (optional)

## Terraform State Management

For production, configure S3 backend in `main.tf`:
```hcl
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "wms/prod/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}
```

## Monitoring and Backups

- PM2 manages application processes
- Logs are rotated daily via logrotate
- Database backups run daily at 2 AM
- Backups can be stored in S3 if configured

## Troubleshooting

### Terraform Issues
```bash
cd infrastructure/terraform/environments/prod
terraform init -upgrade
terraform plan
```

### Ansible Connection Issues
```bash
ansible -i infrastructure/ansible/inventory/prod.yml all -m ping
```

### Application Issues
```bash
# Check PM2 status
make ssh-prod
pm2 status
pm2 logs wms

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

## Cost Optimization

- Use `t3.micro` instances for development
- Disable NAT Gateway for single-instance deployments
- Use local PostgreSQL instead of RDS for small deployments
- Schedule instance stop/start for non-production environments