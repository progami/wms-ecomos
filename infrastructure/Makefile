.PHONY: help deploy check-status retry-deploy plan apply destroy validate ssh logs

# Default
help:
	@echo "WMS Infrastructure Management"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  provision     - Create AWS infrastructure (EC2, networking, etc.)"
	@echo "  status        - Check infrastructure and app status"
	@echo "  plan          - Preview infrastructure changes"
	@echo "  apply         - Apply infrastructure changes only"
	@echo "  destroy       - Destroy all AWS resources"
	@echo "  validate      - Validate Terraform configuration"
	@echo "  ssh           - SSH into the EC2 instance"
	@echo "  logs          - View application logs"
	@echo ""
	@echo "Examples:"
	@echo "  make provision    # Create AWS infrastructure"
	@echo "  make status       # Check if app is running"
	@echo "  make destroy      # Remove all AWS resources"

# Infrastructure targets
provision:
	@echo "Provisioning AWS infrastructure..."
	@cd terraform/environments/prod && terraform init && terraform apply -auto-approve
	@echo ""
	@echo "Infrastructure created! To deploy the app:"
	@echo "1. Add these GitHub secrets:"
	@echo "   - EC2_HOST: $$(cd terraform/environments/prod && terraform output -raw instance_ip)"
	@echo "   - EC2_SSH_KEY: contents of ~/.ssh/wms-prod"
	@echo "2. Push to main branch or run GitHub Actions manually"

status:
	@echo "Checking infrastructure and application status..."
	@cd terraform/environments/prod && \
		IP=$$(terraform output -raw instance_ip 2>/dev/null) && \
		if [ -n "$$IP" ]; then \
			echo "Instance IP: $$IP"; \
			echo "Instance URL: http://$$IP"; \
			echo ""; \
			echo "Checking services:"; \
			curl -s -o /dev/null -w "- Nginx: %{http_code}\n" http://$$IP || echo "- Nginx: Not responding"; \
			curl -s http://$$IP | grep -q "WMS" && echo "- App: Running ✓" || echo "- App: Not deployed"; \
		else \
			echo "No infrastructure found. Run 'make provision' first."; \
		fi

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