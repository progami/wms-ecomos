# AWS ECS Deployment Guide for WMS

This guide explains how to deploy the Warehouse Management System (WMS) to AWS using ECS (Elastic Container Service) with automatic CI/CD via GitHub Actions.

## Architecture Overview

- **Container Orchestration**: AWS ECS Fargate (serverless containers)
- **Load Balancer**: Application Load Balancer (ALB)
- **Database**: RDS PostgreSQL 15
- **Container Registry**: Amazon ECR
- **CI/CD**: GitHub Actions
- **Infrastructure as Code**: Terraform
- **Secrets Management**: AWS Secrets Manager
- **Monitoring**: CloudWatch Logs & Container Insights

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed locally
4. **Terraform** installed (v1.0+)
5. **GitHub repository** with Actions enabled

## Setup Instructions

### 1. Initial AWS Setup

Run the automated setup script:

```bash
./scripts/setup-aws-deployment.sh
```

This script will:
- Create S3 bucket for Terraform state
- Create ECR repository
- Set up IAM roles
- Configure CloudWatch log groups
- Store secrets in AWS Secrets Manager
- Initialize Terraform

### 2. Deploy Infrastructure with Terraform

Deploy the infrastructure for your chosen environment:

```bash
cd aws/terraform

# For staging
terraform plan -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars

# For production
terraform plan -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars
```

Terraform will create:
- VPC with public/private subnets
- Security groups
- RDS PostgreSQL database
- ECS cluster and service
- Application Load Balancer
- All necessary IAM roles and policies

### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets → Actions):

**AWS Credentials:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Staging Environment:**
- `STAGING_DATABASE_URL`
- `STAGING_NEXTAUTH_SECRET`
- `STAGING_URL`

**Production Environment:**
- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_NEXTAUTH_SECRET`
- `PRODUCTION_URL`

**Optional (if using integrations):**
- `AMAZON_SP_APP_ID`
- `AMAZON_REFRESH_TOKEN`
- `AMAZON_MARKETPLACE_ID`
- `AMAZON_REGION`
- `AMAZON_SP_APP_CLIENT_ID`
- `AMAZON_SP_APP_CLIENT_SECRET`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### 4. Initial Docker Image Build

Build and push the initial Docker image:

```bash
# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and tag the image
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/wms-app:staging-latest .

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/wms-app:staging-latest
```

## Deployment Workflow

### Automatic Deployment

The system is configured for automatic deployment:

1. **Push to `staging` branch** → Deploys to staging environment
2. **Push to `main` branch** → Deploys to production environment

The GitHub Actions workflow will:
1. Run all tests (lint, unit, integration)
2. Build Docker image
3. Push to ECR
4. Update ECS service with new image
5. Wait for service stability
6. Run health checks

### Manual Deployment

You can also trigger deployments manually:

1. Go to Actions tab in GitHub
2. Select "Deploy to AWS ECS" workflow
3. Click "Run workflow"
4. Select branch and environment

## Environment Configuration

### Staging Environment
- **Resources**: Smaller instance sizes (cost-optimized)
- **Replicas**: 1 container
- **Database**: db.t3.micro with 20GB storage
- **Memory**: 1GB
- **CPU**: 512 units

### Production Environment
- **Resources**: Larger instance sizes (performance-optimized)
- **Replicas**: 2 containers (high availability)
- **Database**: db.t3.medium with 100GB storage (auto-scaling to 1TB)
- **Memory**: 2GB
- **CPU**: 1024 units
- **Backups**: 30-day retention
- **Deletion Protection**: Enabled

## Monitoring and Logs

### CloudWatch Logs
View application logs:
```bash
# Staging logs
aws logs tail /ecs/wms-staging --follow

# Production logs
aws logs tail /ecs/wms-production --follow
```

### ECS Service Status
Check service status:
```bash
aws ecs describe-services --cluster wms-cluster --services wms-service-staging
```

### Database Connection
Connect to RDS database:
```bash
# Get database endpoint from Terraform output
terraform output database_endpoint

# Connect using psql
psql -h <endpoint> -U wms_admin -d wms_staging
```

## Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check CloudWatch logs
   - Verify environment variables in Secrets Manager
   - Ensure database is accessible

2. **Health check failures**
   - Verify `/api/health` endpoint is working
   - Check security group rules
   - Increase health check grace period if needed

3. **Database connection errors**
   - Verify RDS security group allows ECS tasks
   - Check DATABASE_URL format
   - Ensure database is running

4. **Image push failures**
   - Re-authenticate with ECR
   - Check ECR repository exists
   - Verify IAM permissions

### Debugging Commands

```bash
# List running tasks
aws ecs list-tasks --cluster wms-cluster --service-name wms-service-staging

# Describe a task
aws ecs describe-tasks --cluster wms-cluster --tasks <task-arn>

# Get service events
aws ecs describe-services --cluster wms-cluster --services wms-service-staging --query 'services[0].events[:10]'

# Check ALB target health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

## Cost Management

### Estimated Monthly Costs (US East 1)

**Staging Environment:**
- ECS Fargate: ~$18 (1 task × 0.5 vCPU × 1GB)
- RDS: ~$15 (db.t3.micro)
- ALB: ~$22
- Data transfer: ~$10
- **Total: ~$65/month**

**Production Environment:**
- ECS Fargate: ~$72 (2 tasks × 1 vCPU × 2GB)
- RDS: ~$48 (db.t3.medium)
- ALB: ~$22
- Data transfer: ~$20
- **Total: ~$162/month**

### Cost Optimization Tips
1. Use Fargate Spot for staging
2. Enable RDS auto-pause for staging
3. Use S3 lifecycle policies for logs
4. Review and remove unused resources

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to Git
   - Use AWS Secrets Manager for all sensitive data
   - Rotate secrets regularly

2. **Network Security**
   - Keep ECS tasks in private subnets
   - Use security groups as firewalls
   - Enable VPC flow logs

3. **Container Security**
   - Scan images with ECR scanning
   - Use specific image tags (not :latest)
   - Run containers as non-root user

4. **Access Control**
   - Use IAM roles, not access keys
   - Follow principle of least privilege
   - Enable MFA for AWS console

## Backup and Recovery

### Database Backups
- Automated backups: Daily
- Retention: 7 days (staging) / 30 days (production)
- Point-in-time recovery enabled

### Manual Backup
```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier wms-db-production \
  --db-snapshot-identifier wms-db-production-manual-$(date +%Y%m%d%H%M%S)
```

### Restore from Backup
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier wms-db-production-restored \
  --db-snapshot-identifier <snapshot-id>
```

## Scaling

### Manual Scaling
```bash
# Scale service
aws ecs update-service \
  --cluster wms-cluster \
  --service wms-service-production \
  --desired-count 3
```

### Auto Scaling Setup
Configure auto-scaling based on CPU/memory:
```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/wms-cluster/wms-service-production \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/wms-cluster/wms-service-production \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## Maintenance

### Regular Tasks
1. **Weekly**: Review CloudWatch logs and metrics
2. **Monthly**: Update dependencies and rebuild images
3. **Quarterly**: Review and optimize costs
4. **Annually**: Disaster recovery drill

### Update Process
1. Test updates in staging first
2. Use blue-green deployments for zero-downtime
3. Monitor metrics after deployment
4. Keep rollback plan ready

## Support

For issues or questions:
1. Check CloudWatch logs first
2. Review this documentation
3. Check AWS service health
4. Contact DevOps team

Remember to always test changes in staging before applying to production!