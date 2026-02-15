module.exports = {
  apps: [
    {
      name: "pump-api",
      cwd: "./apps/api",
      script: "npm",
      args: "run start:prod",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "pump-web",
      cwd: "./apps/web",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
