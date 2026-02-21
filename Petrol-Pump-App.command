#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

clear

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PETROL PUMP MANAGEMENT SYSTEM                          ║"
echo "║     Starting Application...                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}[!] Docker Desktop is not running${NC}"
    echo ""
    echo "Starting Docker Desktop automatically..."
    echo "Please wait 30-40 seconds..."
    echo ""
    
    # Try to start Docker Desktop on macOS
    if [ -d "/Applications/Docker.app" ]; then
        open -a Docker
        echo "Docker Desktop is starting..."
        sleep 35
    else
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║  DOCKER DESKTOP NOT FOUND                                  ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Please install Docker Desktop from:"
        echo "https://www.docker.com/products/docker-desktop"
        echo ""
        echo "After installation, run this application again."
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    fi
    
    # Check again
    if ! docker info > /dev/null 2>&1; then
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║  PLEASE START DOCKER DESKTOP MANUALLY                      ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
        echo "1. Open Docker Desktop from Applications"
        echo "2. Wait for Docker to fully start"
        echo "3. Run this application again"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

echo -e "${GREEN}[✓] Docker is running${NC}"
echo ""

# Start database
echo -e "${BLUE}[→] Starting database...${NC}"
docker-compose up -d > /dev/null 2>&1
sleep 3
echo -e "${GREEN}[✓] Database started${NC}"
echo ""

# Generate Prisma
echo -e "${BLUE}[→] Generating Prisma...${NC}"
cd apps/api
npx prisma generate > /dev/null 2>&1
cd ../..
echo -e "${GREEN}[✓] Prisma generated${NC}"
echo ""

# Build API
echo -e "${BLUE}[→] Building API...${NC}"
cd apps/api
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[!] API build failed${NC}"
    cd ../..
    read -p "Press any key to exit..."
    exit 1
fi
if [ ! -f "dist/src/main.js" ]; then
    echo -e "${RED}[!] API build incomplete - dist/src/main.js not found${NC}"
    cd ../..
    read -p "Press any key to exit..."
    exit 1
fi
cd ../..
echo -e "${GREEN}[✓] API built${NC}"
echo ""

# Build Web
echo -e "${BLUE}[→] Building Web...${NC}"
cd apps/web
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[!] Web build failed${NC}"
    cd ../..
    read -p "Press any key to exit..."
    exit 1
fi
cd ../..
echo -e "${GREEN}[✓] Web built${NC}"
echo ""

# Start API
echo -e "${BLUE}[→] Starting API...${NC}"
cd apps/api
npm run start:prod > /dev/null 2>&1 &
cd ../..
sleep 5
echo -e "${GREEN}[✓] API started${NC}"
echo ""

# Start Web
echo -e "${BLUE}[→] Starting Web...${NC}"
cd apps/web
npm run start > /dev/null 2>&1 &
cd ../..
sleep 5
echo -e "${GREEN}[✓] Web started${NC}"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  APPLICATION IS READY! (PRODUCTION MODE)                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Opening browser..."
sleep 3

# Open browser
open http://localhost:3000

echo ""
echo "Application URL: http://localhost:3000"
echo "Login: admin / admin123"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  TO STOP: Press any key                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Wait for any key press
read -n 1 -s -r

# Cleanup
echo ""
echo "Stopping application..."
pkill -f "node" > /dev/null 2>&1
docker-compose down > /dev/null 2>&1
echo "Application stopped."
sleep 2
