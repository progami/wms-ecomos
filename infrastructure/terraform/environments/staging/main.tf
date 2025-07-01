terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  backend "s3" {
    # Configure backend in terraform.tfvars or via CLI
    # bucket = "your-terraform-state-bucket"
    # key    = "wms/staging/terraform.tfstate"
    # region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  project_name = "wms"
  environment  = "staging"
  
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "terraform"
  }
}

module "vpc" {
  source = "../../modules/vpc"
  
  project_name         = local.project_name
  environment          = local.environment
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_nat_gateway  = var.enable_nat_gateway
  tags                = local.common_tags
}

module "security" {
  source = "../../modules/security"
  
  project_name    = local.project_name
  environment     = local.environment
  vpc_id          = module.vpc.vpc_id
  ssh_allowed_ips = var.ssh_allowed_ips
  use_alb         = var.use_alb
  use_rds         = var.use_rds
  tags            = local.common_tags
}

module "ec2" {
  source = "../../modules/ec2"
  
  project_name      = local.project_name
  environment       = local.environment
  instance_type     = var.instance_type
  instance_count    = var.instance_count
  subnet_ids        = var.use_private_subnets ? module.vpc.private_subnet_ids : module.vpc.public_subnet_ids
  security_group_id = module.security.ec2_security_group_id
  public_key        = var.public_key
  use_elastic_ip    = !var.use_private_subnets
  tags              = local.common_tags
}

module "rds" {
  count = var.use_rds ? 1 : 0
  source = "../../modules/rds"
  
  project_name      = local.project_name
  environment       = local.environment
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.security.rds_security_group_id
  instance_class    = var.rds_instance_class
  tags              = local.common_tags
}

module "alb" {
  count = var.use_alb ? 1 : 0
  source = "../../modules/alb"
  
  project_name        = local.project_name
  environment         = local.environment
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.public_subnet_ids
  security_group_id   = module.security.alb_security_group_id
  target_instance_ids = module.ec2.instance_ids
  ssl_certificate_arn = var.ssl_certificate_arn
  tags                = local.common_tags
}

module "s3" {
  source = "../../modules/s3"
  
  project_name = local.project_name
  environment  = local.environment
  tags         = local.common_tags
}

resource "local_file" "ansible_inventory" {
  filename = "../../ansible/inventory/staging.yml"
  content = templatefile("${path.module}/inventory.tpl", {
    instances = [
      for idx, ip in module.ec2.public_ips : {
        name       = "wms-staging-${idx + 1}"
        public_ip  = ip
        private_ip = module.ec2.private_ips[idx]
      }
    ]
    db_endpoint = var.use_rds ? module.rds[0].db_instance_endpoint : ""
    db_name     = var.use_rds ? module.rds[0].db_name : ""
    db_username = var.use_rds ? module.rds[0].db_username : ""
    alb_dns     = var.use_alb ? module.alb[0].alb_dns_name : ""
  })
  
  depends_on = [module.ec2]
}