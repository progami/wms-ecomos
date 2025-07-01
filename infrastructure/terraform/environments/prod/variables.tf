variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type (t2.micro or t3.micro for free tier)"
  type        = string
  default     = "t2.micro"  # Free tier eligible
}

variable "public_key" {
  description = "SSH public key for EC2 access"
  type        = string
}

variable "ssh_allowed_ips" {
  description = "List of IPs allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Allow from anywhere (less secure but simpler)
}

variable "create_s3_bucket" {
  description = "Create S3 bucket for file storage"
  type        = bool
  default     = false  # Set to true if you need file storage
}