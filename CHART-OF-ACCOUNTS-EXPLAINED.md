# Chart of Accounts - Complete Value Source Guide

## Overview
This document explains EXACTLY where each account's balance comes from, what transactions affect it, and how values are calculated.

---

## 🔢 HOW ACCOUNT BALANCES ARE CALCULATED

**Location**: `accounting.service.ts` → `updateAccountBalance()`

### Formula:
```typescript
// For ASSETS and EXPENSES:
balance = Total Debits - Total Credits

// For LIABILITIES, EQUITY, and INCOME:
balance = Total Credits - Total Debits
```

### When Balance Updates:
Every time a transaction is created, BOTH accounts (debit and credit) are automatically updated.

---

## 💰 ASSET ACCOUNTS (10000-19999)

### 10101 - Cash in Hand
**Type**: ASSET  
**Balance Formula**: Debits - Credits

**INCREASES (Debit) when**:
- Cash sale made → `sales.service.ts` → `createSale()` with `paymentMethod = 'CASH'`
- Customer pays credit in cash → `sales.service.ts` → `clearCredit()` with `paymentMethod = 'CASH'`

**DECREASES (Credit) when**:
- Cash purchase made → `inventory.service.ts` → `purchaseProduct()` with `paymentMethod = 'CASH'`
- Supplier paid in cash → `suppliers.service.ts` → `paySupplier()` with `paymentMethod = 'CASH'`
- Expense paid in cash → `expenses.service.ts` → `create()` with `paymentMethod = 'CASH'`

**Current Balance Shows**: Total cash physically in hand

**Transaction Query**:
```sql
Debits: SELECT SUM(amount) FROM Transaction WHERE debitAccountId = (SELECT id FROM Account WHERE code = '10101')
Credits: SELECT SUM(amount) FROM Transaction WHERE creditAccountId = (SELECT id FROM Account WHERE code = '10101')
Balance = Debits - Credits
```

---

### 10201 - Bank Account (Card/Online)
**Type**: ASSET  
**Balance Formula**: Debits - Credits

**INCREASES (Debit) when**:
- Card/Online sale made → `sales.service.ts` → `createSale()` with `paymentMethod = 'CARD' or 'ONLINE'`
- Customer pays credit via card/online → `sales.service.ts` → `clearCredit()` with `paymentMethod = 'CARD' or 'ONLINE'`

**DECREASES (Credit) when**:
- Bank purchase made → `inventory.service.ts` → `purchaseProduct()` with `paymentMethod = 'CARD' or 'ONLINE'`
- Supplier paid via bank → `suppliers.service.ts` → `paySupplier()` with `paymentMethod = 'CARD' or 'ONLINE'`

**Current Balance Shows**: Total money in bank/card/online accounts

**Note**: This account aggregates ALL non-cash electronic payments. Individual payment accounts (JazzCash, EasyPaisa, etc.) are tracked separately in `PaymentAccount` table but all flow through this account.

---

### 10301 - Accounts Receivable
**Type**: ASSET  
**Balance Formula**: Debits - Credits

**INCREASES (Debit) when**:
- Credit sale made → `sales.service.ts` → `createSale()` with `paymentMethod = 'CREDIT'`
  - Entry: Debit 10301, Credit 40101

**DECREASES (Credit) when**:
- Customer pays credit → `sales.service.ts` → `clearCredit()`
  - Entry: Debit 10101/10201, Credit 10301

**Current Balance Shows**: Total amount customers owe (receivables)

**Verification**:
```sql
-- Should match sum of all customer credit balances
SELECT SUM(totalCredit) FROM CreditCustomer
```

**Important**: Each customer's balance is tracked in `CreditCustomer.totalCredit`. This account shows the TOTAL of all customers.

---

### 10401 - Fuel Inventory
**Type**: ASSET  
**Balance Formula**: Debits - Credits

**INCREASES (Debit) when**:
- Fuel purchased → `inventory.service.ts` → `purchaseProduct()`
  - Entry: Debit 10401, Credit 10101/10201/20101
  - Amount = quantity × purchasePrice

**DECREASES (Credit) when**:
- Fuel sold (COGS recorded) → `sales.service.ts` → `createSale()`
  - Entry: Debit 50201, Credit 10401
  - Amount = quantity × purchasePrice
- Inventory shrinkage detected → `accounting.service.ts` → `syncInventoryAccountBalance()`
  - Entry: Debit 50301, Credit 10401

**ADJUSTED when**:
- Inventory sync runs → `accounting.service.ts` → `syncInventoryAccountBalance()`
  - Calculates: `SUM(tank.currentStock × product.purchasePrice)` for all tanks
  - If physical inventory > ledger: Debit 10401, Credit 30101 (gain)
  - If physical inventory < ledger: Debit 50301, Credit 10401 (loss)

**Current Balance Shows**: Value of fuel in tanks at purchase price

**Verification**:
```sql
-- Should match physical inventory value
SELECT SUM(currentStock * purchasePrice) 
FROM Tank 
JOIN Product ON Tank.productId = Product.id
```

---

## 📊 LIABILITY ACCOUNTS (20000-29999)

### 20101 - Accounts Payable
**Type**: LIABILITY  
**Balance Formula**: Credits - Debits

**INCREASES (Credit) when**:
- Unpaid/Partial purchase made → `inventory.service.ts` → `purchaseProduct()`
  - Entry: Debit 10401, Credit 20101
  - Amount = unpaid portion of purchase

**DECREASES (Debit) when**:
- Supplier paid → `suppliers.service.ts` → `paySupplier()`
  - Entry: Debit 20101, Credit 10101/10201

**Current Balance Shows**: Total amount owed to suppliers

**Verification**:
```sql
-- Should match sum of all supplier balances
SELECT SUM(balance) FROM Supplier WHERE isDeleted = false
```

**Important**: Each supplier's balance is tracked in `Supplier.balance`. This account shows the TOTAL of all suppliers.

---

## 💼 EQUITY ACCOUNTS (30000-39999)

### 30101 - Owner's Equity
**Type**: EQUITY  
**Balance Formula**: Credits - Debits

**INCREASES (Credit) when**:
- Inventory valuation gain → `accounting.service.ts` → `syncInventoryAccountBalance()`
  - Entry: Debit 10401, Credit 30101
  - When physical inventory > ledger balance
- Owner invests money (manual entry)

**DECREASES (Debit) when**:
- Owner withdraws money (manual entry)

**Current Balance Shows**: Owner's investment + accumulated adjustments

**Note**: This account captures equity adjustments. Net profit is calculated separately from Income - Expenses.

---

## 💵 INCOME ACCOUNTS (40000-49999)

### 40101 - Fuel Sales
**Type**: INCOME  
**Balance Formula**: Credits - Debits

**INCREASES (Credit) when**:
- ANY sale made → `sales.service.ts` → `createSale()`
  - Cash: Debit 10101, Credit 40101
  - Card/Online: Debit 10201, Credit 40101
  - Credit: Debit 10301, Credit 40101
  - Amount = quantity × sellingPrice

**Current Balance Shows**: Total revenue from all fuel sales

**Breakdown by Payment Method**:
```sql
-- Cash Sales
SELECT SUM(amount) FROM Transaction 
WHERE creditAccountId = (SELECT id FROM Account WHERE code = '40101')
AND debitAccountId = (SELECT id FROM Account WHERE code = '10101')

-- Card/Online Sales
SELECT SUM(amount) FROM Transaction 
WHERE creditAccountId = (SELECT id FROM Account WHERE code = '40101')
AND debitAccountId = (SELECT id FROM Account WHERE code = '10201')

-- Credit Sales
SELECT SUM(amount) FROM Transaction 
WHERE creditAccountId = (SELECT id FROM Account WHERE code = '40101')
AND debitAccountId = (SELECT id FROM Account WHERE code = '10301')
```

---

### 40201 - Stock Gain
**Type**: INCOME  
**Balance Formula**: Credits - Debits

**INCREASES (Credit) when**:
- Physical inventory exceeds ledger → `accounting.service.ts` → `syncInventoryAccountBalance()`
  - Entry: Debit 10401, Credit 40201
  - Rare - usually indicates measurement error or unrecorded stock

**Current Balance Shows**: Gains from inventory adjustments

---

## 💸 EXPENSE ACCOUNTS (50000-59999)

### 50101 - General Expenses
**Type**: EXPENSE  
**Balance Formula**: Debits - Credits

**INCREASES (Debit) when**:
- Expense recorded → `expenses.service.ts` → `create()`
  - Entry: Debit 50101 (or category-specific account), Credit 10101
  - Categories: Salaries, Utilities, Maintenance, etc.

**Current Balance Shows**: Total operating expenses

**Note**: Each expense category can have its own account (50301, 50401, etc.). This is the default general expense account.

---

### 50201 - Cost of Goods Sold (COGS)
**Type**: EXPENSE  
**Balance Formula**: Debits - Credits

**INCREASES (Debit) when**:
- Fuel sold → `sales.service.ts` → `createSale()`
  - Entry: Debit 50201, Credit 10401
  - Amount = quantity × purchasePrice
  - This happens AUTOMATICALLY with every sale

**Current Balance Shows**: Total cost of fuel that has been sold

**Profit Calculation**:
```
Gross Profit = Fuel Sales (40101) - COGS (50201)
```

**Verification**:
```sql
-- Should match total cost of all sold fuel
SELECT SUM(quantity * purchasePrice) 
FROM Transaction 
WHERE creditAccountId = (SELECT id FROM Account WHERE code = '40101')
```

---

### 50301 - Stock Loss
**Type**: EXPENSE  
**Balance Formula**: Debits - Credits

**INCREASES (Debit) when**:
- Physical inventory less than ledger → `accounting.service.ts` → `syncInventoryAccountBalance()`
  - Entry: Debit 50301, Credit 10401
  - Indicates shrinkage, evaporation, theft, or measurement error

**Current Balance Shows**: Losses from inventory adjustments

---

## 🔄 TRANSACTION FLOW EXAMPLES

### Example 1: Cash Sale of 10L Petrol @ Rs. 280/L
**File**: `sales.service.ts` → `createSale()`

```
Purchase Price: Rs. 270/L
Selling Price: Rs. 280/L
Quantity: 10L

Transaction 1 (Revenue):
  Debit: 10101 (Cash) = Rs. 2,800
  Credit: 40101 (Fuel Sales) = Rs. 2,800

Transaction 2 (COGS):
  Debit: 50201 (COGS) = Rs. 2,700
  Credit: 10401 (Inventory) = Rs. 2,700

Result:
  Cash increases by Rs. 2,800
  Revenue increases by Rs. 2,800
  Inventory decreases by Rs. 2,700
  COGS increases by Rs. 2,700
  Gross Profit = Rs. 2,800 - Rs. 2,700 = Rs. 100
```

---

### Example 2: Credit Sale of 20L Diesel @ Rs. 300/L
**File**: `sales.service.ts` → `createSale()`

```
Purchase Price: Rs. 285/L
Selling Price: Rs. 300/L
Quantity: 20L
Customer: Ali (Vehicle: ABC-123)

Transaction 1 (Revenue):
  Debit: 10301 (Accounts Receivable) = Rs. 6,000
  Credit: 40101 (Fuel Sales) = Rs. 6,000

Transaction 2 (COGS):
  Debit: 50201 (COGS) = Rs. 5,700
  Credit: 10401 (Inventory) = Rs. 5,700

Also Updates:
  CreditCustomer.totalCredit += Rs. 6,000

Result:
  Receivables increase by Rs. 6,000
  Revenue increases by Rs. 6,000
  Inventory decreases by Rs. 5,700
  COGS increases by Rs. 5,700
  Customer owes Rs. 6,000
```

---

### Example 3: Purchase 1000L Petrol @ Rs. 270/L (Unpaid)
**File**: `inventory.service.ts` → `purchaseProduct()`

```
Quantity: 1000L
Rate: Rs. 270/L
Total: Rs. 270,000
Payment: UNPAID

Transaction:
  Debit: 10401 (Inventory) = Rs. 270,000
  Credit: 20101 (Accounts Payable) = Rs. 270,000

Also Updates:
  Tank.currentStock += 1000L
  Supplier.balance += Rs. 270,000

Result:
  Inventory increases by Rs. 270,000
  Payables increase by Rs. 270,000
  Supplier balance increases by Rs. 270,000
```

---

### Example 4: Pay Supplier Rs. 100,000 in Cash
**File**: `suppliers.service.ts` → `paySupplier()`

```
Supplier: PSO
Amount: Rs. 100,000
Method: CASH

Transaction:
  Debit: 20101 (Accounts Payable) = Rs. 100,000
  Credit: 10101 (Cash) = Rs. 100,000

Also Updates:
  Supplier.balance -= Rs. 100,000
  Purchase records updated (FIFO allocation)

Result:
  Payables decrease by Rs. 100,000
  Cash decreases by Rs. 100,000
  Supplier balance decreases by Rs. 100,000
```

---

### Example 5: Customer Pays Credit Rs. 6,000 via JazzCash
**File**: `sales.service.ts` → `clearCredit()`

```
Customer: Ali
Amount: Rs. 6,000
Method: ONLINE (JazzCash)

Transaction:
  Debit: 10201 (Bank Account) = Rs. 6,000
  Credit: 10301 (Accounts Receivable) = Rs. 6,000

Also Updates:
  CreditCustomer.totalCredit -= Rs. 6,000
  CreditRecord.remainingAmount updated (FIFO)

Result:
  Bank increases by Rs. 6,000
  Receivables decrease by Rs. 6,000
  Customer balance decreases by Rs. 6,000
```

---

## 📈 FINANCIAL REPORTS - DATA SOURCES

### Profit & Loss Statement
```
Revenue:
  Fuel Sales = Account 40101 balance
  Stock Gain = Account 40201 balance
  Total Income = 40101 + 40201

Expenses:
  COGS = Account 50201 balance
  General Expenses = Account 50101 balance
  Stock Loss = Account 50301 balance
  Total Expenses = 50201 + 50101 + 50301

Net Profit = Total Income - Total Expenses
```

### Balance Sheet
```
Assets:
  Cash = Account 10101 balance
  Bank = Account 10201 balance
  Receivables = Account 10301 balance
  Inventory = Account 10401 balance
  Total Assets = 10101 + 10201 + 10301 + 10401

Liabilities:
  Payables = Account 20101 balance
  Total Liabilities = 20101

Equity:
  Owner's Equity = Account 30101 balance
  Net Profit = (Income - Expenses)
  Total Equity = 30101 + Net Profit

Formula: Assets = Liabilities + Equity
```

### Trial Balance
```
Lists all accounts with their balances:
  Debit side: Assets (10xxx) + Expenses (50xxx)
  Credit side: Liabilities (20xxx) + Equity (30xxx) + Income (40xxx)

Total Debits must equal Total Credits
```

---

## 🔍 HOW TO VERIFY ACCOUNT BALANCES

### Cash in Hand (10101)
```sql
-- Manual verification
SELECT 
  (SELECT COALESCE(SUM(amount), 0) FROM Transaction WHERE debitAccountId = (SELECT id FROM Account WHERE code = '10101')) -
  (SELECT COALESCE(SUM(amount), 0) FROM Transaction WHERE creditAccountId = (SELECT id FROM Account WHERE code = '10101'))
AS calculated_balance,
  (SELECT balance FROM Account WHERE code = '10101') AS stored_balance;
```

### Accounts Receivable (10301)
```sql
-- Should match customer balances
SELECT 
  (SELECT balance FROM Account WHERE code = '10301') AS account_balance,
  (SELECT SUM(totalCredit) FROM CreditCustomer) AS customer_total;
```

### Accounts Payable (20101)
```sql
-- Should match supplier balances
SELECT 
  (SELECT balance FROM Account WHERE code = '20101') AS account_balance,
  (SELECT SUM(balance) FROM Supplier WHERE isDeleted = false) AS supplier_total;
```

### Fuel Inventory (10401)
```sql
-- Should match physical inventory value
SELECT 
  (SELECT balance FROM Account WHERE code = '10401') AS account_balance,
  (SELECT SUM(t.currentStock * p.purchasePrice) 
   FROM Tank t 
   JOIN Product p ON t.productId = p.id) AS physical_value;
```

---

## 🛠️ TROUBLESHOOTING

### Balance Doesn't Match Expected Value
1. Check if `updateAccountBalance()` was called after transaction
2. Verify transaction was created with correct debit/credit codes
3. Run manual verification query (see above)
4. Check for orphaned transactions

### Inventory Value Mismatch
1. Run `syncInventoryAccountBalance()` manually
2. Check for unrecorded sales or purchases
3. Verify tank stock levels are accurate
4. Look for COGS entries without corresponding sales

### Receivables/Payables Mismatch
1. Verify `CreditCustomer.totalCredit` matches 10301
2. Verify `Supplier.balance` matches 20101
3. Check for payment transactions without proper allocation
4. Look for deleted customers/suppliers with outstanding balances

---

© 2026 Petrol Pump Management System
