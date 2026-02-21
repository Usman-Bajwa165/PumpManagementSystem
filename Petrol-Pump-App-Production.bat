@echo off
title Petrol Pump Management System - Production
color 0A
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     PETROL PUMP MANAGEMENT SYSTEM - PRODUCTION             ║
echo ║     Starting Application...                                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check Docker
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Docker Desktop is not running
    echo.
    echo Starting Docker Desktop automatically...
    echo Please wait 30-40 seconds...
    echo.
    
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        echo Docker Desktop is starting...
        timeout /t 35 /nobreak >nul
    ) else (
        echo [!] Docker Desktop not found. Please install Docker Desktop.
        pause
        exit /b 1
    )
    
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Please start Docker Desktop manually and try again.
        pause
        exit /b 1
    )
)

echo [✓] Docker is running
echo.

REM Start database
echo [→] Starting database...
docker-compose up -d >nul 2>&1
timeout /t 5 /nobreak >nul
echo [✓] Database started
echo.

REM Generate Prisma
echo [→] Generating Prisma...
cd apps\api
call npx prisma generate >nul 2>&1
cd ..\..
echo [✓] Prisma generated
echo.

REM Build API
echo [→] Building API...
cd apps\api
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [!] API build failed
    cd ..\..
    pause
    exit /b 1
)
if not exist "dist\src\main.js" (
    echo [!] API build incomplete - dist\src\main.js not found
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo [✓] API built
echo.

REM Build Web
echo [→] Building Web...
cd apps\web
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [!] Web build failed
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo [✓] Web built
echo.

REM Start API
echo [→] Starting API...
start /B cmd /c "cd apps\api && npm run start:prod"
timeout /t 5 /nobreak >nul
echo [✓] API started
echo.

REM Start Web
echo [→] Starting Web...
start /B cmd /c "cd apps\web && npm run start"
timeout /t 5 /nobreak >nul
echo [✓] Web started
echo.

echo ╔════════════════════════════════════════════════════════════╗
echo ║  APPLICATION IS READY! (PRODUCTION MODE)                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Opening browser...
timeout /t 3 /nobreak >nul

start http://localhost:3000

echo.
echo Application URL: http://localhost:3000
echo Login: admin / admin123
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  TO STOP: Close this window or press any key              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
pause >nul

REM Cleanup
echo.
echo Stopping application...
taskkill /F /IM node.exe >nul 2>&1
docker-compose down >nul 2>&1
echo Application stopped.
timeout /t 2 /nobreak >nul