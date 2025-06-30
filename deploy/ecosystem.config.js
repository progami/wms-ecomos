module.exports = {
  apps: [{
    // Application configuration
    name: 'wms-production',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/wms',
    
    // Process management
    instances: 1,  // Single instance for t2.micro
    exec_mode: 'fork',
    autorestart: true,
    watch: false,  // Don't watch in production
    max_memory_restart: '1G',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_DIR: '/var/www/wms/logs'
    },
    
    // Logging configuration
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/www/wms/logs/pm2-error.log',
    out_file: '/var/www/wms/logs/pm2-out.log',
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
  }]
};