.PHONY: help deploy check-status retry-deploy plan apply destroy validate ssh logs

# Default
help:
	@echo "WMS Infrastructure Management"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  deploy        - Deploy WMS to AWS (creates infrastructure + deploys app)"
	@echo "  check-status  - Check deployment status"
	@echo "  retry-deploy  - Retry deployment if SSH connection failed"
	@echo "  plan          - Preview infrastructure changes"
	@echo "  apply         - Apply infrastructure changes only"
	@echo "  destroy       - Destroy all AWS resources"
	@echo "  validate      - Validate Terraform configuration"
	@echo "  ssh           - SSH into the EC2 instance"
	@echo "  logs          - View application logs"
	@echo ""
	@echo "Examples:"
	@echo "  make deploy"
	@echo "  make check-status"
	@echo "  make destroy"

# Deployment targets
deploy:
	@cd deploy && ./deploy.sh

check-status:
	@cd deploy && ./check-status.sh

retry-deploy:
	@cd deploy && ./retry-deploy.sh

# Terraform targets
plan:
	@cd terraform/environments/prod && terraform plan

apply:
	@cd terraform/environments/prod && terraform apply

destroy:
	@echo "WARNING: This will destroy all AWS resources!"
	@cd terraform/environments/prod && terraform destroy

# Validation
validate:
	@echo "Validating Terraform configuration..."
	@cd terraform/environments/prod && terraform init -backend=false && terraform validate
	@echo "Configuration is valid!"

# Utility commands
ssh:
	@cd terraform/environments/prod && \
		IP=$$(terraform output -raw instance_ip 2>/dev/null) && \
		if [ -n "$$IP" ]; then \
			ssh -i ~/.ssh/wms-prod ubuntu@$$IP; \
		else \
			echo "No instance found. Run 'make deploy' first."; \
		fi

logs:
	@cd terraform/environments/prod && \
		IP=$$(terraform output -raw instance_ip 2>/dev/null) && \
		if [ -n "$$IP" ]; then \
			ssh -i ~/.ssh/wms-prod ubuntu@$$IP "pm2 logs wms --lines 100"; \
		else \
			echo "No instance found. Run 'make deploy' first."; \
		fi