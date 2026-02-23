# Reports System Documentation

## Overview
This document explains how all financial reports are generated, where data comes from, and how calculations work.

---

## 1. TRIAL BALANCE REPORT

### Data Source
- **Table**: `Account`
- **Method**: `getTrialBalance()` in `reports.service.ts`

### How It Works
1. Fetches ALL accounts from database
2. Groups accounts by type (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
3. For each account:
   - If account type is ASSET or EXPENSE → Shows balance in **Debit** column
   - If account type is LIABILITY, EQUITY, or INCOME → Shows balance in **Credit** column
4. Calculates totals: `totalDebit` and `totalCredit`
5. Checks if balanced: `Math.abs(totalDebit - totalCredit) < 0.01`

### Key Fields
- `Account.balance` - Current balance of each account
- `Account.type` - Determines if debit or credit nature
- `Account.code` - Account code (e.g., 10101 for Cash)
- `Account.name` - Account name (e.g., "Cash in Hand")

### Date Filters
- **Status**: ✅ WORKING
- Calculates balances from transactions within date range
- Uses `Transaction.createdAt` field
- If no date filter provided, shows current balances

---

## 2. BALANCE SHEET REPORT

### Data Source
- **Table**: `Account`
- **Method**: `getBalanceSheet()` in `reports.service.ts`

### How It Works
1. Fetches ALL accounts from database
2. Separates accounts into categories:
   - **Assets**: All accounts with `type = 'ASSET'`
   - **Liabilities**: All accounts with `type = 'LIABILITY'`
   - **Equity**: All accounts with `type = 'EQUITY'`
   - **Income**: All accounts with `type = 'INCOME'` (for net profit calculation)
   - **Expenses**: All accounts with `type = 'EXPENSE'` (for net profit calculation)
3. Calculates:
   - `totalAssets` = Sum of all asset account balances
   - `totalLiabilities` = Sum of all liability account balances
   - `totalEquity` = Sum of all equity account balances
   - `netProfit` = Total Income - Total Expenses
   - `totalLiabilitiesAndEquity` = totalLiabilities + totalEquity + netProfit
4. Verifies: `totalAssets ≈ totalLiabilitiesAndEquity` (within Rs. 1)

### Formula
```
Assets = Liabilities + Equity + Net Profit
```

### Key Accounts
- **Assets**: 10101 (Cash), 10201 (Bank), 10301 (Accounts Receivable), 10401 (Inventory)
- **Liabilities**: 20101 (Accounts Payable)
- **Income**: 40101 (Fuel Sales)
- **Expenses**: 50201 (Cost of Goods Sold)

### Date Filters
- **Status**: ✅ WORKING
- Calculates balances from transactions within date range
- Uses `Transaction.createdAt` field
- If no date filter provided, shows current balances

---

## 3. PROFIT & LOSS REPORT

### Data Source
- **Table**: `Account`
- **Method**: `getProfitLoss()` in `reports.service.ts`

### How It Works
1. Fetches ALL accounts from database
2. Filters accounts:
   - **Income Accounts**: `type = 'INCOME'`
   - **Expense Accounts**: `type = 'EXPENSE'`
3. Calculates:
   - `totalIncome` = Sum of all income account balances
   - `totalExpense` = Sum of all expense account balances
   - `netProfit` = totalIncome - totalExpense
4. Returns breakdown of each income and expense account

### Formula
```
Net Profit = Total Income - Total Expenses
```

### Key Accounts
- **Income**: 40101 (Fuel Sales)
- **Expenses**: 50201 (Cost of Goods Sold), 50301 (Salaries), 50401 (Utilities)

### Date Filters
- **Status**: ✅ WORKING
- Calculates balances from transactions within date range
- Uses `Transaction.createdAt` field
- If no date filter provided, shows current balances

---

## 4. SALES REPORT

### Data Source
- **Table**: `Transaction`
- **Method**: `getSalesReport()` in `reports.service.ts`

### How It Works
1. Filters transactions where `creditAccount.code = '40101'` (Fuel Sales)
2. Applies date filters: `createdAt >= startDate AND createdAt <= endDate`
3. Applies additional filters:
   - Shift ID
   - Nozzle ID
   - Product ID
   - Payment Type (CASH/CREDIT/BANK)
4. Groups data based on view mode:
   - **DAILY_SUMMARY**: Groups by date
   - **SHIFT_WISE**: Groups by shift
   - **NOZZLE_WISE**: Groups by nozzle
   - **NOZZLE_READINGS**: Shows individual nozzle readings
   - **DETAILED_SALES**: Shows all transactions

### Date Filters
- **Status**: ✅ WORKING
- Uses `Transaction.createdAt` field
- Adjusts endDate to 23:59:59 for full day inclusion

---

## 5. PURCHASE REPORT

### Data Source
- **Table**: `Purchase`
- **Method**: `getPurchaseReport()` in `reports.service.ts`

### How It Works
1. Fetches from `Purchase` table
2. Applies filters:
   - Date range: `date >= startDate AND date <= endDate`
   - Supplier ID
   - Payment Status (PAID/UNPAID/PARTIAL)
   - Product ID
3. For each purchase:
   - `totalCost` = quantity × rate
   - `paidAmount` = Amount paid so far
   - `remainingAmount` = totalCost - paidAmount
   - `status` = Payment status from Purchase.status field

### Date Filters
- **Status**: ✅ WORKING
- Uses `Purchase.date` field
- Adjusts endDate to 23:59:59 for full day inclusion

---

## 6. LEDGER REPORTS (Supplier & Customer)

### Data Source
- **Tables**: `Supplier`, `Customer`, `Purchase`, `Transaction`
- **Methods**: `getSupplierLedger()`, `getCustomerLedger()` in `reports.service.ts`

### How It Works

#### Supplier Ledger:
1. Fetches supplier from `Supplier` table
2. Fetches purchases: `Purchase` where `supplierId = id AND date BETWEEN startDate AND endDate`
3. Fetches payments: `Transaction` where `supplierId = id AND debitAccount.code = '20101' AND createdAt BETWEEN startDate AND endDate`
4. Combines and sorts by date
5. Shows current `Supplier.balance` as running balance for ALL rows (static ledger)

#### Customer Ledger:
1. Fetches customer from `CreditCustomer` table
2. Fetches credit sales: `Transaction` where `customerId = id AND creditAccount.code = '40101' AND debitAccount.code = '10301' AND createdAt BETWEEN startDate AND endDate`
3. Fetches payments: `Transaction` where `customerId = id AND creditAccount.code = '10301' AND createdAt BETWEEN startDate AND endDate`
4. Combines and sorts by date
5. Calculates running balance for each row

### Date Filters
- **Status**: ✅ WORKING
- Uses `Purchase.date` for purchases
- Uses `Transaction.createdAt` for payments
- Adjusts endDate to 23:59:59 for full day inclusion

---

## How to Modify Reports

### To Add New Report Type:
1. Add method in `apps/api/src/reports/reports.service.ts`
2. Add route in `apps/api/src/reports/reports.controller.ts`
3. Add tab in `apps/web/src/app/reports/page.tsx`
4. Add rendering logic in reports page

### To Modify Calculations:
1. Edit the respective method in `reports.service.ts`
2. All calculations use `Account.balance` as source of truth
3. Account balances are updated by `accounting.service.ts` during transactions

### To Add Filters:
1. Add filter state in `reports/page.tsx`
2. Add filter UI in the controls section
3. Pass filter as query param to API
4. Handle filter in backend service method

---

## Important Notes

1. **Account Balances**: All reports use `Account.balance` as source of truth (or calculate from transactions when date filter applied)
2. **Double-Entry**: Every transaction updates TWO accounts (debit and credit)
3. **Date Filters**: ALL reports now support date filtering - they calculate balances from transactions within the date range
4. **Trial Balance, Balance Sheet, Profit & Loss**: Support date filtering by calculating from transactions
5. **Supplier Balance**: `Supplier.balance` is the single source of truth for payables
6. **Customer Balance**: `CreditCustomer.totalCredit` is the single source of truth for receivables

---

## Account Codes Reference

| Code  | Name                    | Type      | Description                    |
|-------|-------------------------|-----------|--------------------------------|
| 10101 | Cash in Hand            | ASSET     | Physical cash                  |
| 10201 | Bank Account            | ASSET     | Bank balance                   |
| 10301 | Accounts Receivable     | ASSET     | Customer credit                |
| 10401 | Fuel Inventory          | ASSET     | Stock value                    |
| 20101 | Accounts Payable        | LIABILITY | Supplier payables              |
| 30101 | Owner's Equity          | EQUITY    | Owner investment               |
| 40101 | Fuel Sales              | INCOME    | Revenue from sales             |
| 50201 | Cost of Goods Sold      | EXPENSE   | Purchase cost of fuel sold     |
| 50301 | Salaries Expense        | EXPENSE   | Staff salaries                 |
| 50401 | Utilities Expense       | EXPENSE   | Electricity, water, etc.       |

---

© 2026 Petrol Pump Management System
