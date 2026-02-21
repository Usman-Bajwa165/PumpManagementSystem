@echo off
title System Health Check
color 0B
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     PETROL PUMP SYSTEM HEALTH CHECK                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check Docker
echo [1/4] Checking Docker...
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Docker: Running
) else (
    echo [!] Docker: Not Running
)

REM Check Database
echo [2/4] Checking Database...
docker ps | findstr pump-db >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Database: Running
) else (
    echo [!] Database: Not Running
)

REM Check API
echo [3/4] Checking API...
curl -s http://localhost:3001 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] API: Responding
) else (
    echo [!] API: Not Responding
)

REM Check Web
echo [4/4] Checking Web Interface...
curl -s http://localhost:3000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Web: Responding
) else (
    echo [!] Web: Not Responding
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  SYSTEM INFORMATION                                        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Log Files Location: apps\api\logs\
echo Latest Log: 
dir /B /O:D apps\api\logs\*.log 2>nul | findstr /E ".log" | tail -1

echo.
echo Database Backups:
if exist "backups" (
    dir /B /O:D backups 2>nul | tail -3
) else (
    echo No backups found
)

echo.
echo Disk Space:
for /f "tokens=3" %%a in ('dir /-c ^| findstr /C:"bytes free"') do echo Free Space: %%a bytes

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  QUICK ACTIONS                                             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 1. View latest logs: type apps\api\logs\app-%date:~-4,4%-%date:~-10,2%-%date:~-7,2%.log
echo 2. Restart system: Close this window and run desktop shortcut
echo 3. Update system: Run update.bat
echo.
pause