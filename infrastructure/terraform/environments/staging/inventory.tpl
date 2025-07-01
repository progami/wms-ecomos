all:
  children:
    wms_servers:
      hosts:
%{ for instance in instances ~}
        ${instance.name}:
          ansible_host: ${instance.public_ip}
          private_ip: ${instance.private_ip}
%{ endfor ~}
      vars:
        ansible_user: deploy
        ansible_ssh_private_key_file: ~/.ssh/wms-prod.pem
        ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
        
        # Application settings
        app_name: wms
        app_port: 3000
        app_directory: /var/www/wms
        node_version: "18"
        
        # Database settings
%{ if db_endpoint != "" ~}
        database_host: ${split(":", db_endpoint)[0]}
        database_port: 5432
        database_name: ${db_name}
        database_user: ${db_username}
        use_rds: true
%{ else ~}
        database_host: localhost
        database_port: 5432
        database_name: wms
        database_user: wms
        use_rds: false
%{ endif ~}
        
        # Load balancer settings
%{ if alb_dns != "" ~}
        alb_dns_name: ${alb_dns}
        use_alb: true
%{ else ~}
        use_alb: false
%{ endif ~}