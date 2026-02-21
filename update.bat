@echo off
title Petrol Pump System Update
color 0E
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     PETROL PUMP SYSTEM UPDATE                              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Stop running application
echo [→] Stopping application...
taskkill /F /IM node.exe >nul 2>&1
docker-compose down >nul 2>&1
timeout /t 3 /nobreak >nul
echo [✓] Application stopped
echo.

REM Create backup
echo [→] Creating backup...
if not exist "backups" mkdir backups
set BACKUP_NAME=backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%
set BACKUP_NAME=%BACKUP_NAME: =0%
xcopy /E /I /Y apps backups\%BACKUP_NAME% >nul 2>&1
echo [✓] Backup created: backups\%BACKUP_NAME%
echo.

REM Install updates
echo [→] Installing updates...
echo.
echo MANUAL STEP REQUIRED:
echo 1. Copy new files from update package
echo 2. Replace existing files when prompted
echo 3. Press any key to continue after copying files
echo.
pause

REM Rebuild application
echo [→] Rebuilding application...
npm install >nul 2>&1
echo [✓] Dependencies updated

cd apps\api
npm run build >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] API build failed - check for errors
    cd ..\..
    pause
    exit /b 1
)
echo [✓] API rebuilt
cd ..\..

cd apps\web
npm run build >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Web build failed - check for errors
    cd ..\..
    pause
    exit /b 1
)
echo [✓] Web rebuilt
cd ..\..

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  UPDATE COMPLETED SUCCESSFULLY!                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo You can now start the application using the desktop shortcut.
echo.
echo If there are any issues, restore from backup:
echo backups\%BACKUP_NAME%
echo.
pause