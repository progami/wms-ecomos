#!/bin/bash

echo "🚀 Creating new EC2 instance for WMS..."

REGION="us-east-1"
KEY_NAME="wms-prod"
INSTANCE_TYPE="t2.micro"
SECURITY_GROUP_ID="sg-0c655633ad4391618"

# Get latest Ubuntu AMI
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --region $REGION \
    --output text)

echo "Using AMI: $AMI_ID"
echo "Security Group: $SECURITY_GROUP_ID"

# Simple user data to ensure SSM works
cat > /tmp/user-data.sh << 'EOF'
#!/bin/bash
apt-get update
apt-get install -y curl git
EOF

# Create instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SECURITY_GROUP_ID \
    --iam-instance-profile Name=EC2-SSM-Profile \
    --user-data file:///tmp/user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=wms-production}]" \
    --region $REGION \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Created instance: $INSTANCE_ID"

# Wait for instance
echo "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "✅ Instance created successfully!"
echo ""
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo ""
echo "📝 Next steps:"
echo "1. Update .github/workflows/deploy.yml with:"
echo "   INSTANCE_ID=\"$INSTANCE_ID\""
echo ""
echo "2. Application will be at:"
echo "   http://$PUBLIC_IP:3000/WMS/auth/login"
echo ""
echo "3. Wait 2-3 minutes for SSM agent to be ready"
echo "4. Run deployment with: ./scripts/deploy-to-new-instance.sh $INSTANCE_ID"