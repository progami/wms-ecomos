module.exports = {
  apps: [{
    // Application configuration
    name: 'wms-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/wms',
    
    // Process management
    instances: 1,  // Single instance for t3.small
    exec_mode: 'fork',
    autorestart: true,
    watch: false,  // Don't watch in production
    max_memory_restart: '1G',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    
    // Logging configuration
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/pm2/wms-error.log',
    out_file: '/var/log/pm2/wms-out.log',
    merge_logs: true,
    
    // Advanced features
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000,
    
    // Restart strategies
    restart_delay: 4000,
    exp_backoff_restart_delay: 100,
    
    // Health monitoring
    max_restarts: 10,
    
    // Node.js arguments
    node_args: '--max-old-space-size=1024',
  }],

  // PM2 deployment configuration (optional)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'WMS_EC2_IP',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/wms.git',
      path: '/var/www/wms',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};