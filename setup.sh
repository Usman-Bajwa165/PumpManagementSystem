#!/bin/bash

echo "🚀 Petrol Pump Management System - Setup Script"
echo "================================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v20+ first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop first."
    exit 1
fi

echo "✅ Docker found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f "apps/api/.env" ]; then
    echo "⚠️  Creating apps/api/.env from example..."
    cp apps/api/env.example apps/api/.env 2>/dev/null || echo "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/pump_db\"
JWT_SECRET=\"My-JWT-Secret-Key\"
PORT=3001
TZ=Asia/Karachi" > apps/api/.env
fi

if [ ! -f "apps/web/.env.local" ]; then
    echo "⚠️  Creating apps/web/.env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > apps/web/.env.local
fi

echo "✅ Environment files ready"
echo ""

# Start Docker
echo "🐳 Starting PostgreSQL database..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start database"
    exit 1
fi

echo "✅ Database started"
echo ""

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
echo "🔄 Running database migrations..."
cd apps/api
npx prisma migrate dev --name init

if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    exit 1
fi

echo "✅ Migrations completed"
echo ""

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed

if [ $? -ne 0 ]; then
    echo "⚠️  Seeding failed (may already be seeded)"
fi

cd ../..

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🎉 You can now start the application:"
echo ""
echo "   npm run dev"
echo ""
echo "📱 Access the application at:"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001"
echo ""
echo "🔑 Default credentials:"
echo "   Admin:    admin / admin123"
echo "   Manager:  manager / manager123"
echo "   Operator: operator / operator123"
echo ""
echo "📚 For complete documentation, see WORKFLOW.md"
echo ""
