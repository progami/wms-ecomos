output "instance_ids" {
  description = "IDs of EC2 instances"
  value       = aws_instance.app[*].id
}

output "private_ips" {
  description = "Private IP addresses of instances"
  value       = aws_instance.app[*].private_ip
}

output "public_ips" {
  description = "Public IP addresses of instances"
  value       = var.use_elastic_ip ? aws_eip.app[*].public_ip : aws_instance.app[*].public_ip
}

output "public_dns" {
  description = "Public DNS names of instances"
  value       = aws_instance.app[*].public_dns
}