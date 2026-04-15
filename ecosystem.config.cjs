module.exports = {
  apps: [
    {
      name: "myapp",
      cwd: __dirname,
      script: "dist/server.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      time: true,
      min_uptime: "10s",
      kill_timeout: 5000,
      listen_timeout: 10000,
      max_memory_restart: "350M",
      node_args: "--max-old-space-size=256",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
