variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 1
}

variable "subnet_ids" {
  description = "List of subnet IDs to deploy instances in"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for instances"
  type        = string
}

variable "public_key" {
  description = "Public SSH key for instances"
  type        = string
}

variable "root_volume_size" {
  description = "Size of root volume in GB"
  type        = number
  default     = 20
}

variable "app_port" {
  description = "Port the application runs on"
  type        = number
  default     = 3000
}

variable "node_version" {
  description = "Node.js version to install"
  type        = string
  default     = "18"
}

variable "ansible_user" {
  description = "User for Ansible deployments"
  type        = string
  default     = "deploy"
}

variable "use_elastic_ip" {
  description = "Whether to use Elastic IPs"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}