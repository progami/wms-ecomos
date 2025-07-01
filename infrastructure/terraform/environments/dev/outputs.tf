output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "ec2_instance_ips" {
  description = "Public IP addresses of EC2 instances"
  value       = module.ec2.public_ips
}

output "ec2_private_ips" {
  description = "Private IP addresses of EC2 instances"
  value       = module.ec2.private_ips
}

output "database_endpoint" {
  description = "Database connection endpoint"
  value       = var.use_rds ? module.rds[0].db_instance_endpoint : "Local PostgreSQL on EC2"
}

output "database_url" {
  description = "Database connection URL"
  value       = var.use_rds ? module.rds[0].database_url : "Configure locally on EC2"
  sensitive   = true
}

output "alb_url" {
  description = "URL to access the application"
  value       = var.use_alb ? module.alb[0].alb_url : "http://${module.ec2.public_ips[0]}:3000"
}

output "backup_bucket" {
  description = "S3 bucket for backups"
  value       = module.s3.backup_bucket_name
}

output "ssh_command" {
  description = "SSH command to connect to the first instance"
  value       = "ssh -i ~/.ssh/wms-prod.pem deploy@${module.ec2.public_ips[0]}"
}