# 📊 REPORTS STRUCTURE & CALCULATION GUIDE
## Petrol Pump Management System

> **Complete reference for understanding where data comes from, how it's calculated, and where to adjust report logic**

---

## 📁 FILE LOCATIONS

### Backend (API)
- **Main Reports Service**: `apps/api/src/reports/reports.service.ts`
- **Reports Controller**: `apps/api/src/reports/reports.controller.ts`
- **Accounting Service**: `apps/api/src/accounting/accounting.service.ts`
- **Sales Service**: `apps/api/src/sales/sales.service.ts`
- **Inventory Service**: `apps/api/src/inventory/inventory.service.ts`
- **Expenses Service**: `apps/api/src/expenses/expenses.service.ts`

### Frontend (Web)
- **Reports Page**: `apps/web/src/app/reports/page.tsx`
- **Dashboard Page**: `apps/web/src/app/dashboard/page.tsx`

---

## 🎯 REPORT TYPES & THEIR CALCULATIONS

### 1. 📈 PROFIT & LOSS REPORT

**Location**: `reports.service.ts` → `getProfitLoss()`

**What it shows**: Business performance - Income vs Expenses

**Calculation Logic**:
```typescript
// Income Accounts (Type: INCOME)
totalIncome = SUM(all accounts where type = 'INCOME' → balance)

// Expense Accounts (Type: EXPENSE)  
totalExpense = SUM(all accounts where type = 'EXPENSE' → balance)

// Net Profit
netProfit = totalIncome - totalExpense
```

**Data Sources**:
- **Income**: Account code `40101` (Fuel Sales), `40201` (Stock Gain)
- **Expenses**: Account code `50101` (General Expenses), `50201` (COGS), `50301` (Stock Loss)

**Where to Adjust**:
- Add new income/expense categories: `accounting.service.ts` → `seedAccounts()`
- Change calculation: `reports.service.ts` → `getProfitLoss()`

---

### 2. ⚖️ BALANCE SHEET REPORT

**Location**: `reports.service.ts` → `getBalanceSheet()`

**What it shows**: Financial position at a point in time

**Calculation Logic**:
```typescript
// Assets (What you own)
totalAssets = SUM(accounts where type = 'ASSET' → balance)
// Includes: Cash (10101), Bank (10201), Receivables (10301), Inventory (10401)

// Liabilities (What you owe)
totalLiabilities = SUM(accounts where type = 'LIABILITY' → balance)
// Includes: Accounts Payable (20101)

// Equity (Owner investment)
totalEquity = SUM(accounts where type = 'EQUITY' → balance)
// Includes: Owner Equity (30101)

// Formula Check
isBalanced = totalAssets ≈ (totalLiabilities + totalEquity + netProfit)
```

**Where to Adjust**:
- Account balances update automatically via double-entry bookkeeping
- Manual adjustment: `accounting.service.ts` → `updateAccountBalance()`

---

### 3. 💰 SALES REPORT

**Location**: `reports.service.ts` → `getSalesReport()`

**View Modes**:

#### A. DETAILED SALES
**What it shows**: Every individual sale transaction

**Data Source**: 
```typescript
// Query: Transaction table
WHERE creditAccount.code = '40101' (Fuel Sales)
AND createdAt BETWEEN startDate AND endDate
```

**Columns Shown**:
- Date/Time, Customer, Vehicle, Nozzle, Fuel Type, Quantity, Amount, Payment Method, Paid To, Shift, Operator

**Calculation**:
```typescript
// Each sale record
amount = quantity × sellingPrice
method = debitAccount.code determines payment type:
  - '10101' → CASH
  - '10301' → CREDIT  
  - paymentAccountId exists → CARD/ONLINE
```

#### B. DAILY SUMMARY
**What it shows**: Sales aggregated by date

**Calculation**:
```typescript
FOR each date:
  quantitySold = SUM(quantity)
  cashSales = SUM(amount WHERE method = 'CASH')
  cardSales = SUM(amount WHERE method = 'CARD')
  onlineSales = SUM(amount WHERE method = 'ONLINE')
  creditSales = SUM(amount WHERE method = 'CREDIT')
  totalSales = SUM(amount)
```

#### C. SHIFT WISE
**What it shows**: Sales grouped by shift

**Data Source**: `Shift` table + related transactions

**Calculation**:
```typescript
FOR each shift:
  totalSales = SUM(transactions.amount WHERE shiftId = shift.id)
  quantitySold = SUM(transactions.quantity WHERE shiftId = shift.id)
  profit = 0 (placeholder - can be calculated from COGS)
```

#### D. NOZZLE WISE
**What it shows**: Sales by nozzle from readings

**Data Source**: `NozzleReading` table

**Calculation**:
```typescript
FOR each nozzle reading:
  sale = closingReading - openingReading
  totalSale = sale × product.sellingPrice
```

#### E. NOZZLE READINGS
**What it shows**: Detailed nozzle opening/closing readings

**Data Source**: `NozzleReading` table with shift details

**Where to Adjust**:
- Add filters: `reports.service.ts` → `getSalesReport()` → modify `where` clause
- Change aggregation: `reports.service.ts` → `aggregateDailySummary()`, `aggregateShiftWise()`, etc.

---

### 4. 🚚 PURCHASE REPORT

**Location**: `reports.service.ts` → `getPurchaseReport()`

**What it shows**: All fuel purchases from suppliers

**Data Source**: `Purchase` table

**Calculation**:
```typescript
FOR each purchase:
  totalCost = quantity × rate
  paidAmount = from purchase.paidAmount
  remainingAmount = totalCost - paidAmount
  paymentStatus = purchase.status (PAID/UNPAID/PARTIAL)
```

**Filters Available**:
- Supplier ID
- Payment Status
- Product ID
- Date Range

**Where to Adjust**:
- Add columns: `reports.service.ts` → `getPurchaseReport()` → modify return mapping
- Change filters: `reports.controller.ts` → `getPurchaseReport()` → add query params

---

### 5. 📒 LEDGER REPORTS

**Location**: `reports.service.ts` → `getSupplierLedger()`, `getCustomerLedger()`

#### A. SUPPLIER LEDGER
**What it shows**: All transactions with a supplier

**Calculation**:
```typescript
// Opening Balance (if date filter applied)
openingBalance = SUM(purchases before startDate) - SUM(payments before startDate)

// For each transaction:
IF type = 'PURCHASE':
  credit = totalCost (what we owe increases)
  runningBalance += credit
  
IF type = 'PAYMENT':
  debit = amount (what we owe decreases)
  runningBalance -= debit

// Current Balance
currentBalance = supplier.balance (from Supplier table)
```

**Data Sources**:
- **Purchases**: `Purchase` table WHERE supplierId
- **Payments**: `Transaction` table WHERE supplierId AND creditAccount.code = '20101'

#### B. CUSTOMER LEDGER
**What it shows**: All credit sales and payments from a customer

**Calculation**:
```typescript
// Opening Balance
openingBalance = SUM(credit sales before startDate) - SUM(payments before startDate)

// For each transaction:
IF type = 'CREDIT_SALE':
  credit = amount (what they owe increases)
  runningBalance += credit
  
IF type = 'PAYMENT':
  debit = amount (what they owe decreases)
  runningBalance -= debit

// Current Balance
currentBalance = customer.totalCredit (from CreditCustomer table)
```

**Data Sources**:
- **Credit Sales**: `Transaction` WHERE customerId AND creditAccount.code = '40101' AND debitAccount.code = '10301'
- **Payments**: `Transaction` WHERE customerId AND creditAccount.code = '10301' AND debitAccount.code ≠ '10301'

**Where to Adjust**:
- Change ledger logic: `reports.service.ts` → `getSupplierLedger()` or `getCustomerLedger()`
- Add details: Modify the `details` object in transaction mapping

---

### 6. 📊 TRIAL BALANCE

**Location**: `reports.service.ts` → `getTrialBalance()`

**What it shows**: All accounts with debit/credit balances

**Calculation**:
```typescript
FOR each account:
  IF type = 'ASSET' OR type = 'EXPENSE':
    debit = balance
    credit = 0
  ELSE: // LIABILITY, EQUITY, INCOME
    debit = 0
    credit = balance

// Totals
totalDebit = SUM(all debit columns)
totalCredit = SUM(all credit columns)

// Balance Check
isBalanced = |totalDebit - totalCredit| < 0.01
```

**Where to Adjust**:
- Grouping: `reports.service.ts` → `getTrialBalance()` → modify `grouped` object

---

### 7. 📱 DASHBOARD SUMMARY

**Location**: `reports.service.ts` → `getDashboardSummary()`

**What it shows**: Real-time station overview

**Calculations**:

```typescript
// Today's Sales
todaySales = SUM(transactions.amount WHERE creditAccount.code = '40101' AND createdAt = today)

// Credit Sales
creditSales = SUM(transactions.amount WHERE debitAccount.code = '10301' AND createdAt = today)

// Today's Profit
FOR each sale today:
  cost = quantity × product.purchasePrice
  revenue = amount
totalCost = SUM(all costs)
todayProfit = todaySales - totalCost

// Low Stock Count
lowStockCount = COUNT(tanks WHERE (currentStock / capacity) × 100 < 20)

// 7-Day Trend
FOR each of last 7 days:
  amount = SUM(transactions.amount WHERE creditAccount.code = '40101' AND date = day)

// Inventory Levels
FOR each tank:
  level = (currentStock / capacity) × 100
```

**Where to Adjust**:
- Change metrics: `reports.service.ts` → `getDashboardSummary()`
- Adjust low stock threshold: Modify `< 20` to desired percentage

---

## 🔄 HOW TRANSACTIONS FLOW

### Sale Transaction Flow
**File**: `sales.service.ts` → `createSale()`

```
1. Validate shift is open
2. Check tank has enough stock
3. Deduct from tank.currentStock
4. Update nozzle.lastReading
5. Create accounting transaction:
   - Debit: Cash (10101) / Bank (10201) / Receivables (10301)
   - Credit: Fuel Sales (40101)
6. Record COGS (Cost of Goods Sold):
   - Debit: COGS (50201)
   - Credit: Inventory (10401)
7. Update account balances
8. Send WhatsApp notification (if enabled)
```

### Purchase Transaction Flow
**File**: `inventory.service.ts` → `purchaseProduct()`

```
1. Validate tank and supplier exist
2. Add to tank.currentStock
3. Create Purchase record
4. IF PAID or PARTIAL:
   - Debit: Inventory (10401)
   - Credit: Cash (10101) / Bank (10201)
5. IF UNPAID or remaining amount:
   - Debit: Inventory (10401)
   - Credit: Accounts Payable (20101)
   - Update supplier.balance
6. Sync inventory account balance
7. Send WhatsApp notification (if enabled)
```

### Expense Transaction Flow
**File**: `expenses.service.ts` → `create()`

```
1. Find or create expense category account
2. Create transaction:
   - Debit: Expense Account (50xxx)
   - Credit: Cash (10101)
3. Update account balances
4. Create ExpenseRecord
```

---

## 🎨 FRONTEND DISPLAY LOGIC

### Reports Page
**File**: `apps/web/src/app/reports/page.tsx`

**Key Functions**:
- `fetchReport()`: Calls backend API based on selected report type
- `handleDownloadPDF()`: Generates PDF using jsPDF and autoTable
- Filter state management via URL params

**To Modify Display**:
1. **Add new column**: Update table `<thead>` and `<tbody>` mapping
2. **Change formatting**: Modify `formatDate()`, `formatTime()`, `formatShiftName()`
3. **Add filter**: Add state variable + URL sync in `useEffect`

### Dashboard Page
**File**: `apps/web/src/app/dashboard/page.tsx`

**Key Sections**:
- **Stats Cards**: Pulls from `summary` state
- **Revenue Trend**: 7-day bar chart
- **Fuel Levels**: Tank gauges with percentage

**To Modify**:
1. **Add stat card**: Add to `allStats` array with icon, color, calculation
2. **Change chart**: Modify trend mapping in JSX
3. **Adjust colors**: Update Tailwind classes in card definitions

---

## 🔧 COMMON ADJUSTMENTS

### 1. Add New Report Type
```typescript
// Backend: reports.service.ts
async getMyNewReport(startDate?: Date, endDate?: Date) {
  const data = await this.prisma.myTable.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } }
  });
  return data;
}

// Backend: reports.controller.ts
@Get('my-new-report')
getMyNewReport(@Query('startDate') startDate?: string) {
  return this.reportsService.getMyNewReport(
    startDate ? new Date(startDate) : undefined
  );
}

// Frontend: reports/page.tsx
// Add to tabs array
{ id: "MYNEW", label: "My New Report", icon: FileText }

// Add case in fetchReport()
case "MYNEW":
  endpoint = "/reports/my-new-report";
  break;

// Add display section in JSX
{reportType === "MYNEW" && (
  <div>...</div>
)}
```

### 2. Change Profit Calculation
**File**: `sales.service.ts` → `createSale()`

```typescript
// Current calculation
const profit = (sellingPrice - purchasePrice) × quantity

// To include overhead costs:
const overheadPerLiter = 5; // Rs. 5 per liter
const profit = ((sellingPrice - purchasePrice) × quantity) - (overheadPerLiter × quantity)
```

### 3. Add Filter to Sales Report
**Backend**: `reports.service.ts` → `getDetailedSalesReport()`
```typescript
// Add parameter
async getDetailedSalesReport(
  startDate?: Date,
  endDate?: Date,
  shiftId?: string,
  nozzleId?: string,
  productId?: string,
  paymentType?: string,
  operatorId?: string // NEW
) {
  const where: any = { creditAccount: { code: '40101' } };
  
  // Add filter
  if (operatorId) where.createdById = operatorId;
  
  // ... rest of logic
}
```

**Frontend**: `reports/page.tsx`
```typescript
// Add state
const [selectedOperatorId, setSelectedOperatorId] = useState("");

// Add to filter UI
<select value={selectedOperatorId} onChange={(e) => setSelectedOperatorId(e.target.value)}>
  <option value="">All Operators</option>
  {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
</select>

// Add to API call
params.operatorId = selectedOperatorId;
```

### 4. Adjust Low Stock Threshold
**File**: `reports.service.ts` → `getDashboardSummary()`

```typescript
// Current: 20%
const lowStockCount = tanks.filter(t => {
  const pct = (Number(t.currentStock) / Number(t.capacity)) * 100;
  return pct < 20; // Change this number
}).length;
```

---

## 📊 ACCOUNT CODES REFERENCE

| Code  | Name                      | Type      | Purpose                          |
|-------|---------------------------|-----------|----------------------------------|
| 10101 | Cash in Hand              | ASSET     | Physical cash                    |
| 10201 | Bank Account              | ASSET     | Card/Online payments             |
| 10301 | Accounts Receivable       | ASSET     | Credit sales (customers owe us)  |
| 10401 | Fuel Inventory            | ASSET     | Value of fuel in tanks           |
| 20101 | Accounts Payable          | LIABILITY | Unpaid supplier bills            |
| 30101 | Owner Equity              | EQUITY    | Owner investment                 |
| 40101 | Fuel Sales                | INCOME    | Revenue from fuel sales          |
| 40201 | Stock Gain                | INCOME    | Excess stock found               |
| 50101 | General Expenses          | EXPENSE   | Operating expenses               |
| 50201 | Cost of Goods Sold (COGS) | EXPENSE   | Cost of fuel sold                |
| 50301 | Stock Loss                | EXPENSE   | Shortage/evaporation             |

**To Add New Account**:
```typescript
// File: accounting.service.ts → seedAccounts()
{ code: '50401', name: 'Salaries', type: AccountType.EXPENSE }
```

---

## 🔍 DEBUGGING TIPS

### Report Shows Wrong Data
1. **Check date filters**: Ensure timezone handling in `formatDate()`
2. **Verify account codes**: Confirm transactions use correct debit/credit codes
3. **Check balance updates**: Run `syncInventoryAccountBalance()` manually
4. **Inspect transactions**: Query database directly:
   ```sql
   SELECT * FROM "Transaction" WHERE "createdAt" >= '2026-01-01' ORDER BY "createdAt" DESC;
   ```

### Balance Sheet Not Balanced
1. **Run sync**: `accounting.service.ts` → `syncInventoryAccountBalance()`
2. **Check COGS**: Ensure every sale has matching COGS entry
3. **Verify purchases**: Confirm inventory increases match purchase amounts
4. **Audit transactions**: Look for orphaned transactions without proper debit/credit pairs

### Missing Sales in Report
1. **Check shift status**: Sales only recorded during open shifts
2. **Verify account code**: Ensure creditAccount.code = '40101'
3. **Check date range**: Confirm transaction createdAt falls within filter
4. **Inspect nozzle**: Verify nozzle is linked to correct tank and product

---

## 📞 QUICK REFERENCE

### Need to find where...

| What                          | File                          | Function/Line                    |
|-------------------------------|-------------------------------|----------------------------------|
| Sales are calculated          | `sales.service.ts`            | `createSale()`                   |
| Profit is computed            | `sales.service.ts`            | Line ~90 (profit calculation)    |
| Dashboard metrics             | `reports.service.ts`          | `getDashboardSummary()`          |
| Ledger running balance        | `reports.service.ts`          | `getSupplierLedger()` line ~600  |
| Account balance updates       | `accounting.service.ts`       | `updateAccountBalance()`         |
| Purchase accounting           | `inventory.service.ts`        | `purchaseProduct()`              |
| Expense recording             | `expenses.service.ts`         | `create()`                       |
| Report filters                | `reports/page.tsx`            | `fetchReport()` function         |
| PDF generation                | `reports/page.tsx`            | `handleDownloadPDF()`            |
| Shift-wise aggregation        | `reports.service.ts`          | `aggregateShiftWise()`           |

---

## ✅ VALIDATION CHECKLIST

Before deploying report changes:

- [ ] Test with empty data (no transactions)
- [ ] Test with single transaction
- [ ] Test with date range filters
- [ ] Verify totals match manual calculation
- [ ] Check PDF export includes all columns
- [ ] Test on different screen sizes (responsive)
- [ ] Verify WhatsApp notifications (if applicable)
- [ ] Check account balance updates
- [ ] Test with multiple shifts
- [ ] Verify credit customer balance tracking

---

## 📚 RELATED DOCUMENTATION

- **Setup Guide**: `SETUP-WINDOWS.md`, `SETUP-MAC.md`
- **Client Deployment**: `CLIENT-DEPLOYMENT.md`
- **Database Schema**: `apps/api/prisma/schema.prisma`
- **API Endpoints**: Check `*.controller.ts` files

---

**Last Updated**: 2026-02-23  
**Version**: 1.0  
**Maintained By**: Development Team

---

## 💡 TIPS FOR CUSTOMIZATION

1. **Always backup database** before making accounting changes
2. **Test in development** environment first
3. **Use transactions** (`prisma.$transaction`) for multi-step operations
4. **Log changes** using `CustomLogger` service
5. **Maintain double-entry** bookkeeping integrity (every debit has a credit)
6. **Document custom reports** in this file for future reference

---

**Need Help?** Check the code comments in service files or contact the development team.
