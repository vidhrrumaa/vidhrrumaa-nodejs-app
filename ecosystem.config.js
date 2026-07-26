'use strict';

// PM2 config for a VPS/dedicated server (not needed on cPanel/Passenger).
//   npm install -g pm2
//   pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'vidhrrumaa-api',
      script: 'app.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '300M',
      env: { NODE_ENV: 'development' },
      env_production: { NODE_ENV: 'production' },
    },
  ],
};
