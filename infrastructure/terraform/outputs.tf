output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.wms.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.wms.public_ip
}

output "instance_private_ip" {
  description = "Private IP address of the EC2 instance"
  value       = aws_instance.wms.private_ip
}

output "instance_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.wms.public_dns
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.wms_sg.id
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://${aws_eip.wms.public_ip}:3000"
}