const { exec } = require('child_process');
const os = require('os');

const ports = [3000, 3001];

function killPort(port) {
  return new Promise((resolve) => {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // Windows command
      exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
        if (stdout) {
          const lines = stdout.split('\n');
          lines.forEach(line => {
            const match = line.match(/\s+(\d+)\s*$/);
            if (match) {
              const pid = match[1];
              exec(`taskkill /PID ${pid} /F`, () => {});
            }
          });
        }
        resolve();
      });
    } else {
      // Mac/Linux command
      exec(`lsof -ti:${port}`, (err, stdout) => {
        if (stdout) {
          const pids = stdout.trim().split('\n');
          pids.forEach(pid => {
            if (pid) {
              exec(`kill -9 ${pid}`, () => {});
            }
          });
        }
        resolve();
      });
    }
  });
}

async function killPorts() {
  console.log('🔹 Cleaning up ports...');
  await Promise.all(ports.map(killPort));
  console.log('✅ Ports cleaned');
}

killPorts();