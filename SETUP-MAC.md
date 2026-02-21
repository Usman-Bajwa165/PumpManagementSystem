# Mac Setup Guide

## Prerequisites
1. **Install Docker Desktop**
   - Download: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop

2. **Install Node.js**
   - Download: https://nodejs.org (v20 or higher)
   - Install with default settings

## Setup Steps

### 1. First Time Setup
```bash
# Make setup script executable and run
chmod +x setup.sh && ./setup.sh
```

### 2. Prepare App Launcher
```bash
# Make app launcher executable
chmod +x Petrol-Pump-App.command

# Optional: Move to Desktop for easy access
cp Petrol-Pump-App.command ~/Desktop/
```

### 3. Start Application
- Double-click **"Petrol-Pump-App.command"**
- Browser opens automatically at http://localhost:3000

### 4. Login
- **Username:** admin
- **Password:** admin123

## Daily Use
1. Double-click the .command file
2. Wait for browser to open
3. Login and use the system
4. Press Enter in Terminal to stop

## Troubleshooting
- **Permission denied:** Run `chmod +x setup.sh` and `chmod +x Petrol-Pump-App.command`
- **Docker not running:** Start Docker Desktop manually
- **Port conflicts:** Close other applications using ports 3000, 3001, 5432
- **Setup issues:** Re-run `./setup.sh`