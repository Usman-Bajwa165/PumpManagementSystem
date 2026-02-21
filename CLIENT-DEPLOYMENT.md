# Client Deployment & Management Guide

## 📦 Initial Client Deployment

### 1. Prepare Client Package
```bash
# Create deployment folder
mkdir PumpApp-Client
cd PumpApp-Client

# Copy essential files only
copy apps/ .
copy scripts/ .
copy *.bat .
copy *.sh .
copy *.command .
copy docker-compose.yml .
copy ecosystem.config.js .
copy package*.json .
copy README.md .
copy SETUP-*.md .
```

### 2. Client Installation
1. Give client the `PumpApp-Client` folder
2. Client runs `setup.bat` (Windows) or `./setup.sh` (Mac)
3. Client runs `create-desktop-shortcut.bat`
4. Client uses desktop shortcut daily

## 🔄 Updates & Maintenance

### Option 1: Manual Update (Simple)
1. **Prepare Update Package:**
   - Copy changed files to `Update-v1.1/` folder
   - Include `update-instructions.txt`

2. **Client Update Process:**
   - Stop application
   - Replace files as instructed
   - Restart application

### Option 2: Automated Update Script
Create `update.bat` for client:

```batch
@echo off
echo Updating Petrol Pump System...
echo.

REM Stop application
taskkill /F /IM node.exe >nul 2>&1
docker-compose down >nul 2>&1

REM Backup current version
if not exist "backups" mkdir backups
xcopy /E /I /Y apps backups\apps-%date:~-4,4%%date:~-10,2%%date:~-7,2%

REM Download/copy new files
REM (Client manually copies update files here)

REM Rebuild
npm install
cd apps\api && npm run build && cd ..\..
cd apps\web && npm run build && cd ..\..

echo Update completed!
pause
```

## 📊 Client Activity Tracking

### 1. Built-in Logging (Already Implemented)
- **Location:** `apps/api/logs/`
- **Files:** `app-YYYY-MM-DD.log`
- **Contains:** All API calls, errors, user actions

### 2. Database Activity Monitoring
```sql
-- Check user activity
SELECT * FROM users ORDER BY updated_at DESC;

-- Check recent sales
SELECT * FROM sales WHERE created_at >= NOW() - INTERVAL '7 days';

-- Check shift activity
SELECT * FROM shifts ORDER BY created_at DESC LIMIT 10;
```

### 3. Remote Monitoring Setup (Optional)

#### A. Log File Sharing
```bash
# Client setup: Auto-sync logs to cloud
# Add to client's startup script:
robocopy "apps\api\logs" "C:\Users\%USERNAME%\OneDrive\PumpLogs" /MIR /R:1 /W:1
```

#### B. Database Backup Monitoring
```bash
# Add to ecosystem.config.js
{
  name: "backup-monitor",
  script: "node",
  args: "-e 'setInterval(() => { /* backup logic */ }, 3600000)'",
  cron_restart: "0 */6 * * *"
}
```

### 4. Health Check Script
Create `health-check.bat`:

```batch
@echo off
echo Petrol Pump System Health Check
echo ================================
echo.

REM Check Docker
docker ps | findstr pump-db >nul
if %ERRORLEVEL% EQU 0 (
    echo [✓] Database: Running
) else (
    echo [!] Database: Not Running
)

REM Check API
curl -s http://localhost:3001/health >nul
if %ERRORLEVEL% EQU 0 (
    echo [✓] API: Running
) else (
    echo [!] API: Not Running
)

REM Check Web
curl -s http://localhost:3000 >nul
if %ERRORLEVEL% EQU 0 (
    echo [✓] Web: Running
) else (
    echo [!] Web: Not Running
)

echo.
echo Log files location: apps\api\logs\
echo Database backups: (check backup folder)
echo.
pause
```

## 🔍 Tracking What Clients Are Doing

### 1. Activity Reports
- **Daily Sales:** Check `sales` table
- **User Logins:** Check `users.last_login_at`
- **Shift Changes:** Check `shifts` table
- **Inventory Updates:** Check `inventory_transactions`

### 2. Error Monitoring
- **Log Files:** `apps/api/logs/app-*.log`
- **Database Errors:** Check logs for "ERROR" entries
- **System Issues:** Check Docker container logs

### 3. Usage Analytics
```javascript
// Add to API (apps/api/src/analytics/analytics.service.ts)
export class AnalyticsService {
  async getDailyStats() {
    return {
      sales: await this.getSalesCount(),
      users: await this.getActiveUsers(),
      shifts: await this.getShiftCount(),
      errors: await this.getErrorCount()
    };
  }
}
```

## 📋 Client Support Checklist

### Before Deployment:
- [ ] Test all features work
- [ ] Verify database migrations
- [ ] Check WhatsApp integration
- [ ] Test backup functionality
- [ ] Prepare update documentation

### After Deployment:
- [ ] Monitor logs for first week
- [ ] Check client can access system
- [ ] Verify data is being saved
- [ ] Confirm backups are working
- [ ] Schedule regular check-ins

### For Updates:
- [ ] Test update in staging environment
- [ ] Backup client data before update
- [ ] Provide rollback instructions
- [ ] Monitor system after update
- [ ] Document any issues

## 🚨 Emergency Procedures

### If Client System Fails:
1. **Remote Diagnosis:** Check logs via shared folder
2. **Quick Fix:** Provide emergency script
3. **Data Recovery:** Use database backups
4. **Rollback:** Restore previous version

### Contact Protocol:
1. Client reports issue
2. Check logs remotely (if setup)
3. Provide fix or schedule visit
4. Update documentation with solution