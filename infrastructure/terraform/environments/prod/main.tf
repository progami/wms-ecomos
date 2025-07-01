terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Get current caller identity
data "aws_caller_identity" "current" {}

# Get Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Create key pair
resource "aws_key_pair" "main" {
  key_name   = "wms-prod-key"
  public_key = var.public_key
}

# Security group - Simple version
resource "aws_security_group" "main" {
  name        = "wms-prod-sg"
  description = "Security group for WMS EC2 instance"

  # SSH access from your IP
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_ips
  }

  # HTTP access from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Application port (optional, for direct access)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "wms-prod-sg"
  }
}

# Single EC2 instance
resource "aws_instance" "wms" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.main.key_name
  
  vpc_security_group_ids = [aws_security_group.main.id]
  
  # Free tier eligible storage
  root_block_device {
    volume_type = "gp3"
    volume_size = 30  # 30GB free tier
    encrypted   = true
  }

  # User data to install basic requirements
  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y curl git nginx
    
    # Install Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Install PM2
    npm install -g pm2
    
    # Install PostgreSQL
    apt-get install -y postgresql postgresql-contrib
    
    # Create app directory
    mkdir -p /var/www/wms
    chown ubuntu:ubuntu /var/www/wms
  EOF

  tags = {
    Name = "wms-prod"
    Type = "free-tier"
  }
}

# Elastic IP for consistent access
resource "aws_eip" "wms" {
  instance = aws_instance.wms.id
  domain   = "vpc"
  
  tags = {
    Name = "wms-prod-eip"
  }
}

# Optional: S3 bucket for file storage (free tier: 5GB)
resource "aws_s3_bucket" "storage" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = "wms-${data.aws_caller_identity.current.account_id}-storage"
  
  tags = {
    Name = "wms-storage"
    Type = "free-tier"
  }
}

resource "aws_s3_bucket_public_access_block" "storage" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.storage[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM role for EC2 to access S3 (if needed)
resource "aws_iam_role" "ec2_role" {
  count = var.create_s3_bucket ? 1 : 0
  name  = "wms-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "s3_access" {
  count = var.create_s3_bucket ? 1 : 0
  name  = "wms-s3-access"
  role  = aws_iam_role.ec2_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.storage[0].arn,
        "${aws_s3_bucket.storage[0].arn}/*"
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  count = var.create_s3_bucket ? 1 : 0
  name  = "wms-ec2-profile"
  role  = aws_iam_role.ec2_role[0].name
}

# Outputs
output "instance_ip" {
  value = aws_eip.wms.public_ip
  description = "Public IP of the WMS instance"
}

output "instance_id" {
  value = aws_instance.wms.id
  description = "Instance ID"
}

output "ssh_command" {
  value = "ssh -i ~/.ssh/wms-prod ubuntu@${aws_eip.wms.public_ip}"
  description = "SSH command to connect"
}

output "app_url" {
  value = "http://${aws_eip.wms.public_ip}"
  description = "Application URL"
}

output "s3_bucket" {
  value = var.create_s3_bucket ? aws_s3_bucket.storage[0].id : "Not created"
  description = "S3 bucket name for file storage"
}