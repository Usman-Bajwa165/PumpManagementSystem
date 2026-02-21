# Windows Setup Guide

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
# Run setup script
setup.bat
```

### 2. Create Desktop Shortcut
```bash
# Create desktop icon
create-desktop-shortcut.bat
```

### 3. Start Application
- Double-click **"Petrol Pump App"** on Desktop
- OR run `Petrol-Pump-App-Production.bat`
- Browser opens automatically at http://localhost:3000

### 4. Login
- **Username:** admin
- **Password:** admin123

## Daily Use
1. Double-click Desktop shortcut
2. Wait for browser to open
3. Login and use the system
4. Press any key in console to stop

## Troubleshooting
- **Docker not running:** Start Docker Desktop manually
- **Port conflicts:** Close other applications using ports 3000, 3001, 5432
- **Setup issues:** Re-run `setup.bat`