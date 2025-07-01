#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install basic dependencies
apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  python3-pip \
  unzip \
  jq

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_${node_version}.x | bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install PostgreSQL client
apt-get install -y postgresql-client

# Install Nginx
apt-get install -y nginx

# Setup ansible user for deployments
useradd -m -s /bin/bash ${ansible_user} || true
usermod -aG sudo ${ansible_user}
echo "${ansible_user} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${ansible_user}

# Create application directory
mkdir -p /var/www/wms
chown -R ${ansible_user}:${ansible_user} /var/www/wms

# Setup log directory
mkdir -p /var/log/wms
chown -R ${ansible_user}:${ansible_user} /var/log/wms

# Configure system limits
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
EOF

# Enable and start services
systemctl enable nginx
systemctl start nginx

# Tag instance as ready for Ansible
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
aws ec2 create-tags --resources $INSTANCE_ID --tags Key=Provisioned,Value=true --region $(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region) || true