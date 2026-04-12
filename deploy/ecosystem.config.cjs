module.exports = {
  apps: [
    {
      name: "cfuturo-api",
      cwd: "/var/www/cfuturo",
      script: "dist/server.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      time: true,
      out_file: "/var/log/cfuturo/api-out.log",
      error_file: "/var/log/cfuturo/api-error.log",
    },
  ],
};
