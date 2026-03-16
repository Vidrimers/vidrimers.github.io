module.exports = {
  apps: [
    {
      name: 'vidrimers-api',
      script: './server/server.js',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 1989
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 1989
      },
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart settings
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'database'],
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory and CPU limits
      max_memory_restart: '500M',
      
      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Auto restart on file changes (только для development)
      watch_options: {
        followSymlinks: false,
        usePolling: false
      }
    }
  ],
  
  // Deployment configuration для production
  deploy: {
    production: {
      user: 'root',
      host: 'vidrimers.site',
      ref: 'origin/gh-pages',
      repo: 'git@github.com:vidrimers/vidrimers.github.io.git',
      path: '/home/vidrimers.site',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /home/vidrimers.site/logs && mkdir -p /home/vidrimers.site/database'
    }
  }
};