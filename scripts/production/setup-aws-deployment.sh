#!/bin/bash

# AWS ECS Deployment Setup Script
# This script helps set up the AWS infrastructure for WMS deployment

set -e

echo "🚀 WMS AWS ECS Deployment Setup"
echo "================================"

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed. Aborting." >&2; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform is required but not installed. Aborting." >&2; exit 1; }

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📍 AWS Account ID: $AWS_ACCOUNT_ID"

# Select environment
echo ""
echo "Select environment:"
echo "1) Staging"
echo "2) Production"
read -p "Enter choice [1-2]: " env_choice

case $env_choice in
    1)
        ENVIRONMENT="staging"
        ;;
    2)
        ENVIRONMENT="production"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo "✅ Setting up for $ENVIRONMENT environment"

# Update task definition files with account ID
echo "📝 Updating task definition files..."
sed -i.bak "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" aws/ecs/task-definition-*.json
rm aws/ecs/task-definition-*.json.bak

# Create S3 bucket for Terraform state
BUCKET_NAME="wms-terraform-state-$AWS_ACCOUNT_ID"
echo "📦 Creating S3 bucket for Terraform state: $BUCKET_NAME"
aws s3api create-bucket --bucket $BUCKET_NAME --region us-east-1 2>/dev/null || echo "Bucket already exists"
aws s3api put-bucket-versioning --bucket $BUCKET_NAME --versioning-configuration Status=Enabled

# Create ECR repository
echo "🐳 Creating ECR repository..."
aws ecr create-repository --repository-name wms-app --region us-east-1 2>/dev/null || echo "Repository already exists"

# Create necessary IAM roles
echo "👤 Setting up IAM roles..."
cat > /tmp/ecs-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create ECS task execution role
aws iam create-role \
    --role-name ecsTaskExecutionRole \
    --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
    2>/dev/null || echo "Role already exists"

aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create ECS task role
aws iam create-role \
    --role-name ecsTaskRole \
    --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
    2>/dev/null || echo "Role already exists"

# Create CloudWatch log groups
echo "📊 Creating CloudWatch log groups..."
aws logs create-log-group --log-group-name /ecs/wms-$ENVIRONMENT --region us-east-1 2>/dev/null || echo "Log group already exists"

# Store secrets in AWS Secrets Manager
echo "🔐 Setting up secrets in AWS Secrets Manager..."
echo ""
echo "Please enter the following secrets:"

read -sp "DATABASE_URL: " DATABASE_URL
echo ""
aws secretsmanager create-secret --name wms/$ENVIRONMENT/database-url --secret-string "$DATABASE_URL" 2>/dev/null || \
aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/database-url --secret-string "$DATABASE_URL"

read -sp "NEXTAUTH_SECRET: " NEXTAUTH_SECRET
echo ""
aws secretsmanager create-secret --name wms/$ENVIRONMENT/nextauth-secret --secret-string "$NEXTAUTH_SECRET" 2>/dev/null || \
aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/nextauth-secret --secret-string "$NEXTAUTH_SECRET"

read -p "NEXTAUTH_URL: " NEXTAUTH_URL
aws secretsmanager create-secret --name wms/$ENVIRONMENT/nextauth-url --secret-string "$NEXTAUTH_URL" 2>/dev/null || \
aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/nextauth-url --secret-string "$NEXTAUTH_URL"

# Optional Amazon integration secrets
read -p "Do you want to set up Amazon integration secrets? (y/n): " setup_amazon
if [[ $setup_amazon == "y" ]]; then
    read -p "AMAZON_SP_APP_ID: " AMAZON_SP_APP_ID
    aws secretsmanager create-secret --name wms/$ENVIRONMENT/amazon-sp-app-id --secret-string "$AMAZON_SP_APP_ID" 2>/dev/null || \
    aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/amazon-sp-app-id --secret-string "$AMAZON_SP_APP_ID"
    
    read -sp "AMAZON_REFRESH_TOKEN: " AMAZON_REFRESH_TOKEN
    echo ""
    aws secretsmanager create-secret --name wms/$ENVIRONMENT/amazon-refresh-token --secret-string "$AMAZON_REFRESH_TOKEN" 2>/dev/null || \
    aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/amazon-refresh-token --secret-string "$AMAZON_REFRESH_TOKEN"
    
    read -p "AMAZON_MARKETPLACE_ID: " AMAZON_MARKETPLACE_ID
    aws secretsmanager create-secret --name wms/$ENVIRONMENT/amazon-marketplace-id --secret-string "$AMAZON_MARKETPLACE_ID" 2>/dev/null || \
    aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/amazon-marketplace-id --secret-string "$AMAZON_MARKETPLACE_ID"
    
    read -p "AMAZON_REGION: " AMAZON_REGION
    aws secretsmanager create-secret --name wms/$ENVIRONMENT/amazon-region --secret-string "$AMAZON_REGION" 2>/dev/null || \
    aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/amazon-region --secret-string "$AMAZON_REGION"
    
    read -p "AMAZON_SP_APP_CLIENT_ID: " AMAZON_SP_APP_CLIENT_ID
    aws secretsmanager create-secret --name wms/$ENVIRONMENT/amazon-sp-app-client-id --secret-string "$AMAZON_SP_APP_CLIENT_ID" 2>/dev/null || \
    aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/amazon-sp-app-client-id --secret-string "$AMAZON_SP_APP_CLIENT_ID"
    
    read -sp "AMAZON_SP_APP_CLIENT_SECRET: " AMAZON_SP_APP_CLIENT_SECRET
    echo ""
    aws secretsmanager create-secret --name wms/$ENVIRONMENT/amazon-sp-app-client-secret --secret-string "$AMAZON_SP_APP_CLIENT_SECRET" 2>/dev/null || \
    aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/amazon-sp-app-client-secret --secret-string "$AMAZON_SP_APP_CLIENT_SECRET"
fi

# Optional Google Maps API key
read -p "Do you want to set up Google Maps API key? (y/n): " setup_google
if [[ $setup_google == "y" ]]; then
    read -p "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: " GOOGLE_MAPS_API_KEY
    aws secretsmanager create-secret --name wms/$ENVIRONMENT/google-maps-api-key --secret-string "$GOOGLE_MAPS_API_KEY" 2>/dev/null || \
    aws secretsmanager update-secret --secret-id wms/$ENVIRONMENT/google-maps-api-key --secret-string "$GOOGLE_MAPS_API_KEY"
fi

# Set up GitHub secrets
echo ""
echo "🔑 Setting up GitHub secrets..."
echo "Add the following secrets to your GitHub repository:"
echo ""
echo "AWS_ACCESS_KEY_ID: <your-aws-access-key>"
echo "AWS_SECRET_ACCESS_KEY: <your-aws-secret-key>"
echo ""
echo "For $ENVIRONMENT environment:"
echo "${ENVIRONMENT^^}_DATABASE_URL: $DATABASE_URL"
echo "${ENVIRONMENT^^}_NEXTAUTH_SECRET: ***"
echo "${ENVIRONMENT^^}_URL: $NEXTAUTH_URL"
echo ""

# Initialize Terraform
echo "🏗️  Initializing Terraform..."
cd aws/terraform
terraform init -backend-config="bucket=$BUCKET_NAME"

# Apply Terraform
echo ""
echo "📍 Ready to create infrastructure with Terraform"
echo "Run the following commands to deploy:"
echo ""
echo "cd aws/terraform"
echo "terraform plan -var-file=environments/$ENVIRONMENT.tfvars"
echo "terraform apply -var-file=environments/$ENVIRONMENT.tfvars"
echo ""

# Create initial task definition
echo "📋 Registering initial ECS task definition..."
aws ecs register-task-definition --cli-input-json file://../../aws/ecs/task-definition-$ENVIRONMENT.json --region us-east-1

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run Terraform to create the infrastructure"
echo "2. Build and push the initial Docker image:"
echo "   docker build -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/wms-app:$ENVIRONMENT-latest ."
echo "   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com"
echo "   docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/wms-app:$ENVIRONMENT-latest"
echo "3. Push code to trigger automatic deployment"
echo ""
echo "🌐 Your application will be available at the ALB URL after deployment"