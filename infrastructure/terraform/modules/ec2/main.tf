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

resource "aws_key_pair" "main" {
  key_name   = "${var.project_name}-${var.environment}-key"
  public_key = var.public_key

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-key"
  })
}

resource "aws_instance" "app" {
  count                  = var.instance_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]
  vpc_security_group_ids = [var.security_group_id]
  key_name               = aws_key_pair.main.key_name

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size
    encrypted   = true

    tags = merge(var.tags, {
      Name = "${var.project_name}-${var.environment}-root-${count.index + 1}"
    })
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    environment    = var.environment
    app_port       = var.app_port
    node_version   = var.node_version
    ansible_user   = var.ansible_user
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-app-${count.index + 1}"
    Environment = var.environment
    Ansible     = "true"
  })

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_eip" "app" {
  count    = var.use_elastic_ip ? var.instance_count : 0
  instance = aws_instance.app[count.index].id
  domain   = "vpc"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-eip-${count.index + 1}"
  })
}