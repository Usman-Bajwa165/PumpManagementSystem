// scripts/dev.js
const { exec } = require("child_process");

function run(cmd) {
  return new Promise((resolve, reject) => {
    const p = exec(cmd, { stdio: "inherit" }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
    p.stdout?.pipe(process.stdout);
    p.stderr?.pipe(process.stderr);
  });
}

(async () => {
  try {
    console.log("🔹 Starting Docker containers (docker compose up -d)...");
    await run("docker compose up -d");
    console.log("✅ Docker started (or already running).");

    console.log("🔹 Launching frontend and backend (concurrently)...");
    // Using npm workspace to run respective dev scripts
    const concurrentCmd =
      'npx concurrently "npm --workspace=apps/web run dev" "npm --workspace=apps/api run start:dev"';
    await run(concurrentCmd);
  } catch (e) {
    console.error("\n❌ Failed to start dev environment.");
    console.error(
      "Make sure Docker Desktop is running on your system and docker-compose is available.",
    );
    process.exit(1);
  }
})();
