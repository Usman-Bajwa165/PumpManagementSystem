@echo off
echo ========================================
echo Petrol Pump Management System - Setup
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js v20+ first.
    exit /b 1
)

echo [OK] Node.js found
node -v
echo.

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker not found. Please install Docker Desktop first.
    exit /b 1
)

echo [OK] Docker found
echo.

REM Install dependencies
echo [STEP] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Create .env files
if not exist "apps\api\.env" (
    echo [STEP] Creating apps\api\.env...
    (
        echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pump_db"
        echo JWT_SECRET="My-JWT-Secret-Key"
        echo PORT=3001
        echo TZ=Asia/Karachi
    ) > apps\api\.env
)

if not exist "apps\web\.env.local" (
    echo [STEP] Creating apps\web\.env.local...
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > apps\web\.env.local
)

echo [OK] Environment files ready
echo.

REM Start Docker
echo [STEP] Starting PostgreSQL database...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start database
    exit /b 1
)
echo [OK] Database started
echo.

REM Wait for database
echo [STEP] Waiting for database to be ready...
timeout /t 5 /nobreak >nul

REM Run migrations
echo [STEP] Running database migrations...
cd apps\api
call npx prisma migrate dev --name init
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to run migrations
    exit /b 1
)
echo [OK] Migrations completed
echo.

REM Seed database
echo [STEP] Seeding database...
call npx prisma db seed
echo.

cd ..\..

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo You can now start the application:
echo.
echo    npm run dev
echo.
echo Access the application at:
echo    Frontend: http://localhost:3000
echo    API:      http://localhost:3001
echo.
echo Default credentials:
echo    Admin:    admin / admin123
echo    Manager:  manager / manager123
echo    Operator: operator / operator123
echo.
echo For complete documentation, see WORKFLOW.md
echo.
pause
