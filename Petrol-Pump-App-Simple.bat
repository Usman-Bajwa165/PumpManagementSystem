@echo off
title Petrol Pump Management System
color 0A
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     PETROL PUMP MANAGEMENT SYSTEM                          ║
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
    
    REM Try to start Docker Desktop
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        echo Docker Desktop is starting...
        timeout /t 35 /nobreak >nul
    ) else (
        echo.
        echo ╔════════════════════════════════════════════════════════════╗
        echo ║  DOCKER DESKTOP NOT FOUND                                  ║
        echo ╚════════════════════════════════════════════════════════════╝
        echo.
        echo Please install Docker Desktop from:
        echo https://www.docker.com/products/docker-desktop
        echo.
        echo After installation, run this application again.
        echo.
        pause
        exit /b 1
    )
    
    REM Check again
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ╔════════════════════════════════════════════════════════════╗
        echo ║  PLEASE START DOCKER DESKTOP MANUALLY                      ║
        echo ╚════════════════════════════════════════════════════════════╝
        echo.
        echo 1. Open Docker Desktop from Start Menu
        echo 2. Wait for Docker to fully start
        echo 3. Run this application again
        echo.
        pause
        exit /b 1
    )
)

echo [✓] Docker is running
echo.

REM Start using the dev script (more reliable)
echo [→] Starting application using dev mode...
echo [→] This will start database, API, and web interface...
echo.

npm run dev

echo.
echo Application stopped.
timeout /t 2 /nobreak >nul