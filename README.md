# Petrol Pump Management System

A professional petrol station management solution for the Pakistani market with complete accounting, inventory management, and automated backups.

## 🚀 Quick Setup

**Windows:** See [SETUP-WINDOWS.md](./SETUP-WINDOWS.md)  
**Mac:** See [SETUP-MAC.md](./SETUP-MAC.md)  
**Client Deployment:** See [CLIENT-DEPLOYMENT.md](./CLIENT-DEPLOYMENT.md)

## 🔐 Default Login
- **Username:** admin
- **Password:** admin123

## 🛠️ For Developers

```bash
# Install dependencies
npm install

# Start development
npm run dev
```

**Access:** http://localhost:3000  
**Database Admin:** http://localhost:8081 (Adminer)

## 🚀 Tech Stack
- **Backend:** NestJS + PostgreSQL
- **Frontend:** Next.js 16
- **Database:** Docker PostgreSQL
- **Auth:** JWT with role-based access (Admin, Manager, Operator)
- **Notifications:** WhatsApp Business API
- **Backups:** Automated PDF + SQL backups

## ✅ Key Features

### 💼 Business Operations
- **Shift Management** - Day/Night shift tracking with operator assignments
- **Real-time Dashboard** - Live sales, inventory, and profit monitoring
- **Multi-nozzle Support** - Track sales per nozzle with automatic readings
- **Credit Management** - Customer credit accounts with automated reminders
- **Supplier Management** - Purchase tracking and payment management

### 📊 Accounting & Reports
- **Double-Entry Accounting** - Professional chart of accounts
- **Financial Reports** - Profit & Loss, Balance Sheet, Trial Balance
- **Sales Reports** - Daily, shift-wise, nozzle-wise, detailed views
- **Ledgers** - Customer and supplier ledgers with running balances
- **Invoice Generation** - PDF invoices with WhatsApp delivery

### 🔄 Automated Backups
- **Daily PDF Backups** - Day and night automatic backups
- **Monthly SQL Backups** - Complete database dumps for disaster recovery
- **WhatsApp Delivery** - Backups sent automatically to configured number
- **Local Storage** - Saved to `Documents/PumpBackups` folder

### 📱 WhatsApp Integration
- **Sales Notifications** - Real-time sale alerts
- **Shift Reports** - Automated shift summary delivery
- **Credit Reminders** - Automated customer payment reminders
- **Invoice Delivery** - Send invoices directly to customers
- **Auto-Recovery** - Automatic reconnection on failures

### 🔒 Security & Access Control
- **Role-Based Access** - Admin, Manager, and Operator roles
- **Secure Authentication** - JWT-based session management
- **Audit Logs** - Complete business operation logging
- **Data Integrity** - Transaction-based accounting system

## 📚 Documentation

### Setup & Deployment
- [Setup Guide (Windows)](./SETUP-WINDOWS.md)
- [Setup Guide (Mac)](./SETUP-MAC.md)
- [Client Deployment](./CLIENT-DEPLOYMENT.md)

### Features & Usage
- [Reports Documentation](./REPORTS-DOCUMENTATION.md)
- [Chart of Accounts Explained](./CHART-OF-ACCOUNTS-EXPLAINED.md)
- [Balance Management Feature](./BALANCE-MANAGEMENT-FEATURE.md) ⭐ NEW

### Troubleshooting
- [WhatsApp Fix Guide](./WHATSAPP-FIX-GUIDE.md)
- [WhatsApp Monitor](./WHATSAPP-MONITOR.md)

## 🔧 Common Tasks

### Restore Database from Backup

**Method 1: Using Docker Command**
```bash
cat "C:\Users\Window\Documents\PumpBackups\DB_January-2026.sql" | docker exec -i pump-postgres psql -U postgres -d pump_db
```

**Method 2: Using Adminer (GUI)**
1. Open http://localhost:8081
2. Login with: System=PostgreSQL, Server=postgres, User=postgres, Password=postgres, Database=pump_db
3. Click "SQL command" → "Choose Files"
4. Select your `.sql` backup file
5. Click "Execute"

### Access Database Directly
```bash
# Enter PostgreSQL container
docker exec -it pump-postgres psql -U postgres -d pump_db

# View tables
\dt

# Query data
SELECT * FROM "User";
```

### View Backup Files
- **Windows:** `C:\Users\[YourName]\Documents\PumpBackups`
- **Mac:** `~/Documents/PumpBackups` or `~/Library/Mobile Documents/com~apple~CloudDocs/PumpBackups`

## 🆘 Troubleshooting

### WhatsApp Not Working?
See [WHATSAPP-FIX-GUIDE.md](./WHATSAPP-FIX-GUIDE.md) for:
- QR code scanning issues
- Automatic error recovery
- Connection monitoring
- Queue management

### Database Connection Issues?
1. Ensure Docker Desktop is running
2. Check containers: `docker ps`
3. Restart containers: `docker-compose restart`
4. Check logs: `docker logs pump-postgres`

### Backup Not Working?
1. Check backup folder exists: `Documents/PumpBackups`
2. Verify PostgreSQL is accessible
3. Check application logs for errors
4. Ensure `pg_dump` is available in container

## 📞 Support

For issues or questions:
1. Check the documentation files listed above
2. Review error logs in the application
3. Verify all Docker containers are running
4. Ensure environment variables are correctly set

---

**Version:** 1.0.0  
**Last Updated:** January 2026  
© 2026 Petrol Pump Management System - Professional Edition
