# Petrol Pump Management System

A professional, full-stack management solution tailored for petrol stations in the Pakistani market. Built with a focus on double-entry accounting compliance, visual inventory tracking, and robust shift management.

## 🚀 Technical Stack

- **Monorepo**: Managed via NPM Workspaces.
- **Backend**: NestJS (TypeScript) with JWT/RBAC security.
- **Frontend**: Next.js 16 (Turbopack) with "Industrial Sleek" dark-mode UI.
- **Database**: PostgreSQL 16 managed via Prisma ORM.
- **Process Management**: PM2 configuration for high availability.
- **Integration**: WhatsApp notifications via `whatsapp-web.js`.

## 📂 Project Structure

- `apps/api`: NestJS Backend API.
- `apps/web`: Next.js Frontend Dashboard.
- `ecosystem.config.js`: PM2 configuration for production deployment.
- `docker-compose.yml`: Database and infrastructure setup.

## 🛠️ Installation & Setup

### 1. Prerequisites

- Node.js (v20+)
- Docker Desktop

### 2. Environment Configuration

Create `.env` files in both `apps/api` and `apps/web`.

### 3. Running the Application (Development)

The entire stack (Docker Database, API, and Frontend) can be started with a single command from the root:

```bash
npm run dev
```

### 4. Production Mode

```bash
# Build both apps
npm run build

# Start with PM2 (requires global pm2)
pm2 start ecosystem.config.js
```

## ✅ Verified Features

- [x] **Secure Auth**: Role-based access for Managers and Operators.
- [x] **Live Dashboard**: Real-time sales, credit tracking, and stock alerts.
- [x] **Shift Control**: Validated reading entries and automated variance reports.
- [x] **Accounting**: Automated General Ledger entries for every transaction.
- [x] **Inventory**: Visual gauges and physical dip adjustment.

---

© 2026 Petrol Pump Management System. All Rights Reserved.
