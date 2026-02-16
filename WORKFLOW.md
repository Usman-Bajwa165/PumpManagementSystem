# 🚀 Petrol Pump Management System - Complete Workflow Guide

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Complete User Workflows](#complete-user-workflows)
4. [Technical Architecture](#technical-architecture)
5. [Installation & Setup](#installation--setup)
6. [Backup & Data Management](#backup--data-management)

---

## 🎯 System Overview

A professional petrol station management system built for the Pakistani market with:

- **Double-entry accounting** compliance
- **Real-time inventory tracking** with visual gauges
- **Shift-based operations** with variance reports
- **WhatsApp notifications** for critical events
- **Automated backups** every 12 hours
- **Pakistani timezone** (Asia/Karachi) for all records

---

## 👥 User Roles & Permissions

### 1. **ADMIN** (Full Access)

- ✅ All system features
- ✅ User management
- ✅ Financial reports (P&L, Balance Sheet)
- ✅ WhatsApp integration setup
- ✅ System configuration

### 2. **MANAGER** (Operational Management)

- ✅ Dashboard & analytics
- ✅ Shift management (open/close)
- ✅ Sales recording (cash/credit)
- ✅ Inventory management
- ✅ Financial reports
- ✅ WhatsApp integration
- ❌ User management

### 3. **OPERATOR** (Daily Operations)

- ✅ Dashboard (view only)
- ✅ Shift operations
- ✅ Sales recording
- ✅ Inventory viewing
- ❌ Financial reports
- ❌ WhatsApp setup
- ❌ System configuration

---

## 🔄 Complete User Workflows

### **Workflow 1: Daily Shift Operations (OPERATOR/MANAGER)**

#### Step 1: Login

```
1. Navigate to http://localhost:3000/login
2. Enter credentials
3. System redirects to /dashboard
```

#### Step 2: Open Shift

```
1. Click "Shifts" in sidebar
2. Click "Open New Shift" button
3. System creates shift record with:
   - Shift ID (UUID)
   - Start time (Pakistani timezone)
   - Status: OPEN
   - Opener: Current user
```

**Backend Flow:**

```
POST /shifts/open
→ ShiftsService.openShift()
→ Creates Shift record in database
→ Records opening nozzle readings
→ Returns shift details
```

#### Step 3: Record Sales

```
1. Click "Sales" in sidebar
2. Select product (Petrol/Diesel)
3. Enter:
   - Quantity (liters)
   - Amount (Rs.)
   - Payment method (CASH/CREDIT)
   - Customer name (if credit)
4. Click "Record Sale"
```

**Backend Flow:**

```
POST /sales
→ SalesService.recordSale()
→ Creates double-entry accounting transactions:

   For CASH sale:
   Debit: Cash (10101)          Rs. X
   Credit: Fuel Sales (40101)   Rs. X

   For CREDIT sale:
   Debit: Accounts Receivable (10301)  Rs. X
   Credit: Fuel Sales (40101)          Rs. X

→ Updates inventory (reduces tank stock)
→ Links to active shift
→ Sends WhatsApp notification (if configured)
```

#### Step 4: Check Inventory

```
1. Click "Inventory" in sidebar
2. View real-time tank levels:
   - Visual gauge (percentage)
   - Current stock (liters)
   - Capacity
   - Product type
3. Record physical dip (if needed):
   - Enter measured volume
   - System calculates variance
```

**Backend Flow:**

```
GET /inventory/tanks
→ Returns all tanks with current stock

POST /inventory/dip
→ Records physical measurement
→ Calculates variance (system vs physical)
→ Creates adjustment transaction if needed
```

#### Step 5: Close Shift

```
1. Go to "Shifts"
2. Click "Close Shift" on active shift
3. Enter closing nozzle readings
4. System generates:
   - Total sales (cash + credit)
   - Fuel dispensed (liters)
   - Variance report
   - Shift summary
```

**Backend Flow:**

```
POST /shifts/:id/close
→ ShiftsService.closeShift()
→ Records closing readings
→ Calculates sales variance
→ Updates shift status to CLOSED
→ Sends WhatsApp notification to manager
→ Generates shift report
```

---

### **Workflow 2: Financial Reporting (ADMIN/MANAGER)**

#### View Profit & Loss Statement

```
1. Click "Reports" in sidebar
2. Select "Profit & Loss" tab
3. System displays:
   - Revenue streams (Fuel Sales, etc.)
   - Operational expenses
   - Net profit/loss
   - Live calculation
```

**Backend Flow:**

```
GET /reports/profit-loss
→ ReportsService.getProfitLoss()
→ Queries all INCOME accounts (credit balance)
→ Queries all EXPENSE accounts (debit balance)
→ Calculates: Net Profit = Total Income - Total Expenses
→ Returns structured data
```

#### View Balance Sheet

```
1. Click "Balance Sheet" tab
2. System displays:
   - Assets (Cash, Inventory, Receivables)
   - Liabilities (Payables, Loans)
   - Equity (Capital, Retained Earnings)
   - Verification: Assets = Liabilities + Equity
```

**Backend Flow:**

```
GET /reports/balance-sheet
→ ReportsService.getBalanceSheet()
→ Queries all accounts by type
→ Calculates totals
→ Verifies accounting equation
→ Returns structured data
```

---

### **Workflow 3: WhatsApp Integration (ADMIN/MANAGER)**

#### Setup WhatsApp

```
1. Click "WhatsApp" in sidebar
2. System displays:
   - Connection status
   - QR code (if not connected)
3. Scan QR code with WhatsApp:
   - Open WhatsApp on phone
   - Settings → Linked Devices
   - Link a Device
   - Scan QR code
4. System auto-refreshes every 20 seconds
5. Once connected, shows "Connected Successfully"
```

**Backend Flow:**

```
GET /whatsapp/status
→ Returns: { isReady, status, hasQR }

GET /whatsapp/qr
→ Returns current QR code string

WhatsApp Events:
- 'qr' → Stores QR code, status = 'pending'
- 'authenticated' → status = 'authenticated'
- 'ready' → status = 'ready', isReady = true
- 'auth_failure' → status = 'failed'
```

#### Automatic Notifications

```
System sends WhatsApp messages for:

1. Sale Alert (every sale):
   "⚡ Pump Sale Alert ⚡
   Amount: Rs. 5000
   Method: CASH
   Time: 16 Feb 2026, 6:30 PM"

2. Shift Closed:
   "🏁 Shift Closed 🏁
   Shift ID: abc-123
   Total Sales: Rs. 50,000
   Cash: Rs. 35,000
   Credit: Rs. 15,000
   Time: 16 Feb 2026, 10:00 PM"
```

---

### **Workflow 4: Dashboard Analytics (ALL ROLES)**

#### Real-time Metrics

```
Dashboard displays:

1. Today's Sales (Rs.)
   - Live calculation from transactions
   - Updates on every sale

2. Active Shift
   - Shift ID
   - Started at (time)
   - Duration

3. Credit Sales (Rs.)
   - Today's credit transactions
   - Outstanding receivables

4. Low Stock Alerts
   - Tanks below 20% capacity
   - Visual indicators

5. Sales Trend (7 days)
   - Daily sales chart
   - Trend analysis
```

**Backend Flow:**

```
GET /reports/dashboard-summary
→ Calculates today's sales (since 00:00)
→ Finds active shift (status = OPEN)
→ Calculates credit sales
→ Checks tank levels
→ Generates 7-day trend data
→ Returns comprehensive dashboard data
```

---

## 🏗️ Technical Architecture

### **Backend (NestJS)**

```
apps/api/src/
├── auth/           → JWT authentication, RBAC
├── shifts/         → Shift management
├── sales/          → Sales recording
├── inventory/      → Tank & stock management
├── accounting/     → Double-entry ledger
├── reports/        → Financial reports
├── whatsapp/       → WhatsApp integration
├── backup/         → Automated backups
└── prisma/         → Database ORM
```

### **Frontend (Next.js 16)**

```
apps/web/src/
├── app/
│   ├── dashboard/  → Main dashboard
│   ├── shifts/     → Shift operations
│   ├── sales/      → Sales recording
│   ├── inventory/  → Stock management
│   ├── reports/    → Financial reports
│   └── whatsapp/   → WhatsApp setup
├── components/
│   ├── Sidebar.tsx       → Navigation (role-based)
│   ├── DashboardLayout.tsx → Main layout
│   └── DateTime.tsx      → Pakistani time display
└── lib/
    ├── api.ts            → Axios instance
    └── timezone.ts       → Timezone utilities
```

### **Database (PostgreSQL)**

```
Key Tables:
- users          → User accounts & roles
- shifts         → Shift records
- products       → Fuel types & prices
- tanks          → Storage tanks
- nozzles        → Fuel dispensers
- accounts       → Chart of accounts
- transactions   → Double-entry ledger
- notification_queue → WhatsApp queue
```

---

## 🛠️ Installation & Setup

### **Prerequisites**

- Node.js v20+
- Docker Desktop
- PostgreSQL (via Docker)

### **Step 1: Install Dependencies**

```bash
# Navigate to project root
cd Pump

# Install all dependencies (root + workspaces)
npm install
```

**Important:** Run `npm install` from the **ROOT** folder (`Pump/`), not from `apps/api` or `apps/web`. The monorepo structure uses NPM workspaces, so the root package.json manages all dependencies.

### **Step 2: Environment Configuration**

Create `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pump_db"
JWT_SECRET="My-JWT-Secret-Key"
PORT=3001
TZ=Asia/Karachi
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### **Step 3: Start Database**

```bash
# From root directory
docker-compose up -d
```

### **Step 4: Run Migrations & Seed**

```bash
# From root directory
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

### **Step 5: Start Development**

```bash
# From root directory
npm run dev
```

This starts:

- API: http://localhost:3001
- Web: http://localhost:3000

### **Default Credentials**

```
Admin:
  Username: admin
  Password: admin123

Manager:
  Username: manager
  Password: manager123

Operator:
  Username: operator
  Password: operator123
```

---

## 💾 Backup & Data Management

### **Automated Backups**

- **Frequency:** Every 12 hours (12:00 AM and 12:00 PM PKT)
- **Location:**
  - **Windows:** `C:\Users\[YourName]\Documents\PumpBackups\`
  - **macOS:** `~/Library/Mobile Documents/com~apple~CloudDocs/PumpBackups/` (iCloud)
  - **macOS (fallback):** `~/Documents/PumpBackups/`
- **Format:** PostgreSQL custom format (`.sql`)
- **Retention:** Permanent (all backups kept, manual deletion required)
- **Naming Convention:**
  - **Automatic:** `Auto_DDMMYY_D` (Day/12PM) or `Auto_DDMMYY_N` (Night/12AM)
    - Example: `Auto_160226_D.pdf` (16 Feb 2026, 12:00 PM)
    - Example: `Auto_170226_N.pdf` (17 Feb 2026, 12:00 AM)
  - **Manual:** `Man_DDMMYY_HH:MMam/pm`
    - Example: `Man_160226_03:30pm.pdf` (16 Feb 2026, 3:30 PM)

### **Manual Backup**

**Via UI (Recommended):**

1. Login as Admin/Manager
2. Navigate to **Backups** page in sidebar
3. Click "Create Manual Backup" button
4. Backup created instantly with timestamp
5. View all backups with size and creation date

**Via Command Line:**

```bash
# From apps/api directory
pg_dump -h localhost -U postgres -d pump_db -F c -f backup.sql
```

### **Restore Backup**

```bash
pg_restore -h localhost -U postgres -d pump_db backup.sql
```

---

## 🔐 Security Features

1. **JWT Authentication:** Secure token-based auth
2. **Role-Based Access Control (RBAC):** Route-level permissions
3. **Password Hashing:** bcrypt with salt rounds
4. **CORS Protection:** Configured origins only
5. **Input Validation:** DTO validation on all endpoints
6. **SQL Injection Prevention:** Prisma ORM parameterized queries

---

## 📊 Accounting System

### **Chart of Accounts**

```
ASSETS (10000)
├── 10101 - Cash
├── 10201 - Inventory
└── 10301 - Accounts Receivable

LIABILITIES (20000)
└── 20101 - Accounts Payable

EQUITY (30000)
└── 30101 - Owner's Capital

INCOME (40000)
└── 40101 - Fuel Sales

EXPENSES (50000)
├── 50101 - Cost of Goods Sold
└── 50201 - Operating Expenses
```

### **Transaction Examples**

**Cash Sale (Rs. 5000):**

```
Debit:  Cash (10101)           Rs. 5000
Credit: Fuel Sales (40101)     Rs. 5000
```

**Credit Sale (Rs. 3000):**

```
Debit:  Accounts Receivable (10301)  Rs. 3000
Credit: Fuel Sales (40101)           Rs. 3000
```

**Inventory Purchase (Rs. 100,000):**

```
Debit:  Inventory (10201)           Rs. 100,000
Credit: Accounts Payable (20101)    Rs. 100,000
```

---

## 🌍 Timezone Management

**All timestamps use Pakistani timezone (Asia/Karachi):**

- Database records: Stored in UTC, displayed in PKT
- UI display: Converted to PKT using `toLocaleString('en-PK')`
- Backend: `process.env.TZ = 'Asia/Karachi'` in main.ts
- Frontend: Timezone utility functions in `lib/timezone.ts`

---

## 📱 WhatsApp Integration

**Features:**

- Real-time sale notifications
- Shift closure summaries
- Queue system for failed messages
- Auto-retry (up to 5 attempts)
- QR code authentication
- Session persistence

**Message Queue:**

- Failed messages stored in database
- Processed every minute
- Retry limit: 5 attempts
- Status tracking: PENDING → SENT/FAILED

---

## 🚀 Production Deployment

### **Using PM2**

```bash
# Build both apps
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs
```

### **Environment Variables (Production)**

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/pump_db"
JWT_SECRET="My-JWT-Secret-Key"
NEXT_PUBLIC_API_URL=https://localhost:3001
```

---

## 📞 Support & Troubleshooting

### **Common Issues**

**1. Database Connection Failed**

```bash
# Check Docker is running
docker ps

# Restart database
docker-compose restart
```

**2. WhatsApp Not Connecting**

```bash
# Delete session and retry
rm -rf apps/api/.wwebjs_auth
```

**3. Backup Configuration**

**No configuration needed!** Backups are PDF files generated by the app.

- ✅ Backup directory created automatically
- ✅ No pg_dump required (PDF format)
- ✅ No system PATH configuration
- ✅ Works on Windows/macOS/Linux

**Test backup:**

```bash
# Login as Admin/Manager
# Go to /backup page
# Click "Create Manual Backup"
# Check Documents/PumpBackups folder
```

---

## 📈 Future Enhancements

- [ ] Multi-pump station support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics & forecasting
- [ ] Supplier management
- [ ] Employee attendance tracking
- [ ] Fuel price automation
- [ ] SMS notifications
- [ ] Cloud backup integration

---

© 2026 Petrol Pump Management System. All Rights Reserved.
