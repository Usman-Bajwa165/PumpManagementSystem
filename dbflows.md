# Database Flow Documentation

## Overview
This document explains all database tables, what data they store, where the data comes from, and how it's used in the Petrol Pump Management System.

---

## 1. User Management

### **User Table**
**What it stores:** User accounts with login credentials and roles

**Data comes from:**
- Admin creates users via `/users` page
- Initial admin user created via seed script

**Fields:**
- `username`: Login username
- `password`: Hashed password
- `role`: ADMIN, MANAGER, or OPERATOR
- `createdAt/updatedAt`: Timestamps

**Used by:**
- **Auth Module**: Login authentication
- **Shifts Module**: Tracks who opened/closed shifts
- **All Modules**: Role-based access control

**User Flow:**
1. Admin creates user → Data saved to User table
2. User logs in → Auth checks User table
3. User performs actions → System logs their userId

---

## 2. Shift Management

### **Shift Table**
**What it stores:** Work shifts (Morning/Night) with start/end times and nozzle readings

**Data comes from:**
- Operator/Manager/Admin starts shift via `/shifts` page
- Operator/Manager/Admin ends shift with nozzle readings
- Auto-closed at 12:00 AM/PM if auto-close enabled

**Fields:**
- `startTime`: When shift started
- `endTime`: When shift ended (null if still open)
- `status`: OPEN or CLOSED
- `openerId`: User who started shift
- `closerId`: User who ended shift
- `startReadings`: JSON string of nozzle readings at shift start (nozzle name, reading, product)
- `endReadings`: JSON string of nozzle readings at shift end (nozzle name, opening, closing, sold, product)

**Used by:**
- **Sales Module**: Links sales to shifts
- **Dashboard**: Shows active shift
- **Reports**: Shift-wise sales summary with detailed nozzle readings
- **WhatsApp Module**: Sends shift start/end notifications with readings

**Shift Flow:**
1. User clicks "Start Shift" → System validates nozzles exist
2. If no nozzles → Error: "Cannot start shift. No nozzles are configured"
3. System creates Shift record (status: OPEN)
4. System stores startReadings JSON with all nozzle data
5. WhatsApp notification sent with opening readings
6. Sales are recorded → Linked to active shift
7. User clicks "End Shift" → Enters closing readings
8. System stores endReadings JSON with opening/closing/sold data
9. WhatsApp notification sent with closing readings and sales summary
10. Shift status updated to CLOSED

**Auto-Close Flow (12:00 AM/PM):**
1. Cron job runs at midnight and noon
2. Checks if autoCloseShift is enabled in NotificationPreferences
3. If enabled and shift is open:
   - Automatically closes shift with current nozzle readings
   - Sends WhatsApp notification
   - Waits 2 seconds
   - Automatically starts new shift
   - Sends WhatsApp notification
4. If disabled → No action taken

### **NozzleReading Table**
**What it stores:** Opening and closing readings for each nozzle per shift

**Data comes from:**
- Auto-created when shift starts (opening readings from nozzle.lastReading)
- Updated when shift ends (closing readings from user input)

**Fields:**
- `shiftId`: Which shift
- `nozzleId`: Which nozzle
- `openingReading`: Reading at shift start (copied from nozzle.lastReading)
- `closingReading`: Reading at shift end (user enters manually)

**Used by:**
- **Shifts Module**: Calculate fuel sold per nozzle (closing - opening)
- **Reports**: Variance detection and shift summaries
- **Validation**: Ensures closing reading >= opening reading

**Reading Flow:**
1. Shift starts → System creates NozzleReading for each nozzle
2. Opening reading = current nozzle.lastReading
3. Sales happen → Nozzle.lastReading increments automatically
4. Shift ends → User enters closing readings
5. System validates: closingReading >= openingReading
6. If invalid → Error: "Closing reading cannot be less than opening reading"
7. System updates nozzle.lastReading = closingReading
8. Calculates sold = closing - opening
9. Stores in shift.endReadings JSON for reports

---

## 3. Inventory Management

### **Product Table**
**What it stores:** Fuel types (Petrol, Diesel) with prices

**Data comes from:**
- Admin/Manager creates products via `/setup` page

**Fields:**
- `name`: Product name (e.g., "Petrol")
- `price`: Price per liter

**Used by:**
- **Sales Module**: Calculate sale amounts
- **Inventory Module**: Link tanks to products

**Product Flow:**
1. Admin creates product → Saved to Product table
2. Admin creates tank → Links to product
3. Sale happens → Uses product price for calculation

### **Tank Table**
**What it stores:** Storage tanks with capacity and current stock

**Data comes from:**
- Admin/Manager creates tanks via `/setup` page
- Stock updated via purchases and sales

**Fields:**
- `name`: Tank name (e.g., "Tank 1")
- `productId`: Which product it stores
- `capacity`: Maximum capacity in liters
- `currentStock`: Current stock in liters

**Used by:**
- **Sales Module**: Deducts stock on sales
- **Inventory Module**: Stock purchases add to tank
- **Dashboard**: Shows stock levels

**Tank Flow:**
1. Admin creates tank → Saved with initial stock
2. Purchase made → Stock increases
3. Sale made → Stock decreases
4. Dip recorded → Stock adjusted to physical measurement

### **Nozzle Table**
**What it stores:** Fuel dispensing nozzles linked to tanks

**Data comes from:**
- Admin/Manager creates nozzles via `/setup` page

**Fields:**
- `name`: Nozzle name (e.g., "Nozzle 1")
- `tankId`: Which tank it draws from
- `lastReading`: Cumulative reading in liters

**Used by:**
- **Sales Module**: Records sales per nozzle
- **Shifts Module**: Tracks readings per shift

**Nozzle Flow:**
1. Admin creates nozzle → Linked to tank
2. Sale happens → lastReading increments by quantity sold
3. Shift ends → Readings compared for variance

### **TankDip Table**
**What it stores:** Physical stock measurements (dip readings)

**Data comes from:**
- Manager records physical dip via `/inventory` page

**Fields:**
- `tankId`: Which tank was measured
- `volume`: Physical stock measured
- `measuredAt`: When measurement was taken

**Used by:**
- **Inventory Module**: Adjust system stock to match physical stock
- **Reports**: Track stock variances

**Dip Flow:**
1. Manager measures physical stock → Enters dip reading
2. System compares with current stock → Calculates variance
3. If variance exists → Adjusts stock and creates accounting entry

---

## 4. Sales & Payments

### **Transaction Table**
**What it stores:** All financial transactions (double-entry accounting)

**Data comes from:**
- Sales (CASH, CARD, ONLINE, CREDIT)
- Credit payments
- Stock purchases
- Stock adjustments

**Fields:**
- `shiftId`: Which shift (if applicable)
- `debitAccountId`: Account being debited
- `creditAccountId`: Account being credited
- `amount`: Transaction amount
- `description`: Transaction details

**Used by:**
- **Accounting Module**: Maintain ledger
- **Reports Module**: Generate financial reports
- **Dashboard**: Calculate today's sales

**Transaction Flow:**
1. Sale happens → Creates transaction (Debit: Cash/Bank/Credit, Credit: Sales)
2. Credit cleared → Creates transaction (Debit: Cash, Credit: Accounts Receivable)
3. Stock purchased → Creates transaction (Debit: Inventory, Credit: Payable)

### **CreditCustomer Table**
**What it stores:** Customers who buy fuel on credit

**Data comes from:**
- Created automatically when first credit sale is made
- Updated when more credit is given or cleared

**Fields:**
- `name`: Customer name
- `vehicleNumber`: Customer's vehicle number
- `totalCredit`: Total outstanding credit amount

**Used by:**
- **Sales Module**: Track customer credit
- **Dashboard**: Show total credit outstanding

**Credit Customer Flow:**
1. Credit sale → Creates/updates CreditCustomer record
2. Customer pays → Reduces totalCredit
3. Sales page → Shows customers with outstanding credit

### **CreditRecord Table**
**What it stores:** Individual credit transactions with dates

**Data comes from:**
- Created when credit sale is made
- Updated when credit is cleared

**Fields:**
- `customerId`: Which customer
- `amount`: Original credit amount
- `remainingAmount`: How much is still unpaid
- `creditDate`: When credit was given

**Used by:**
- **Dashboard**: Calculate today's credit (only today's records)
- **Sales Module**: Track which credits are paid (FIFO)

**Credit Record Flow:**
1. Credit sale today → Creates CreditRecord (amount: 1000, remaining: 1000, date: today)
2. Customer pays 400 today → Updates record (remaining: 600)
3. Dashboard shows → Only today's remaining amounts (600)
4. Customer pays 600 tomorrow → Record fully paid (remaining: 0), but doesn't affect today's dashboard

### **PaymentAccount Table**
**What it stores:** Bank accounts for CARD/ONLINE payments

**Data comes from:**
- Admin/Manager creates accounts via `/accounts` page

**Fields:**
- `name`: Account name (e.g., "HBL Business Account")
- `type`: CARD or ONLINE
- `accountNumber`: Optional account number

**Used by:**
- **Sales Module**: Record which account received payment

**Payment Account Flow:**
1. Admin creates account → Saved to PaymentAccount table
2. CARD/ONLINE sale → User selects account
3. Transaction description includes account name

---

## 5. Accounting

### **Account Table**
**What it stores:** Chart of accounts (Assets, Liabilities, Income, Expenses)

**Data comes from:**
- Auto-seeded on first run by AccountingService
- Includes: Cash, Bank, Inventory, Sales, Expenses, etc.

**Fields:**
- `code`: Account code (e.g., "10101" for Cash)
- `name`: Account name
- `type`: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
- `balance`: Current balance

**Used by:**
- **All Modules**: Every financial transaction
- **Reports Module**: Balance sheet, P&L

**Account Flow:**
1. System starts → Seeds default accounts
2. Transaction happens → Updates account balances
3. Reports generated → Uses account balances

---

## 6. WhatsApp Integration

### **NotificationQueue Table**
**What it stores:** Pending WhatsApp messages

**Data comes from:**
- Any module that sends WhatsApp notifications
- Messages queued when WhatsApp is not ready

**Fields:**
- `to`: Phone number
- `message`: Message text
- `status`: PENDING, SENT, FAILED
- `retries`: How many times tried

**Used by:**
- **WhatsApp Module**: Process queue every minute

**Queue Flow:**
1. Notification triggered → Added to queue
2. WhatsApp ready → Message sent → Status: SENT
3. WhatsApp not ready → Retries every minute (max 5 times)

### **NotificationPreferences Table**
**What it stores:** WhatsApp notification settings and auto-shift management

**Data comes from:**
- Auto-created when WhatsApp connects for first time
- Updated via `/whatsapp` preferences page
- Updated via `/shifts` auto-close toggle

**Fields:**
- `phoneNumber`: Connected WhatsApp number
- `salesNotifications`: Enable/disable sale alerts (default: true)
- `shiftNotifications`: Enable/disable shift start/end alerts (default: true)
- `inventoryNotifications`: Enable/disable inventory alerts (default: true)
- `stockNotifications`: Enable/disable stock change alerts (default: true)
- `notifyCash`: Send notifications for cash sales (default: true)
- `notifyCard`: Send notifications for card sales (default: true)
- `notifyOnline`: Send notifications for online sales (default: true)
- `notifyCredit`: Send notifications for credit sales (default: true)
- `minCashAmount`: Minimum amount to trigger cash notification (default: 0)
- `minCardAmount`: Minimum amount to trigger card notification (default: 0)
- `minOnlineAmount`: Minimum amount to trigger online notification (default: 0)
- `minCreditAmount`: Minimum amount to trigger credit notification (default: 0)
- `autoCloseShift`: Auto-close and start shifts at 12:00 AM/PM (default: false)

**Used by:**
- **WhatsApp Module**: Check if notifications should be sent
- **Sales Module**: Check minimum amounts before sending alerts
- **Shifts Module**: Check if auto-close is enabled
- **Cron Jobs**: Auto-shift management at midnight/noon

**Preferences Flow:**
1. WhatsApp connects → Creates NotificationPreferences with phone number
2. User toggles settings → Updates preferences
3. Sale happens → System checks if notification should be sent:
   - Check if salesNotifications enabled
   - Check if payment method notification enabled (notifyCash, notifyCard, etc.)
   - Check if amount >= minimum amount
   - If all true → Send notification
4. Shift starts/ends → System checks shiftNotifications → Sends if enabled
5. Stock changes → System checks stockNotifications → Sends if enabled
6. Auto-close enabled → Cron job closes/starts shifts at 12:00 AM/PM

---

## 7. Real-World Example Flows

### **Complete Shift Lifecycle**

**Morning Shift Start (8:00 AM):**
1. Operator arrives, opens `/shifts` page
2. Clicks "Start Shift" button
3. System validates: Are nozzles configured? (Yes)
4. System creates Shift record:
   - openerId: operator's userId
   - status: OPEN
   - startTime: 2026-01-15 08:00:00
5. System fetches all nozzles with products:
   - Nozzle 1 (Petrol): 15000.50L
   - Nozzle 2 (Diesel): 12000.75L
6. System stores startReadings JSON:
   ```json
   [
     {"nozzle": "Nozzle 1", "reading": 15000.50, "product": "Petrol"},
     {"nozzle": "Nozzle 2", "reading": 12000.75, "product": "Diesel"}
   ]
   ```
7. System creates NozzleReading records:
   - Nozzle 1: openingReading = 15000.50
   - Nozzle 2: openingReading = 12000.75
8. WhatsApp notification sent:
   ```
   🚀 Shift Started 🚀
   By: operator1
   
   Opening Readings:
   Nozzle 1 (Petrol): 15000.50L
   Nozzle 2 (Diesel): 12000.75L
   
   On: 15 Jan 2026 08:00 AM
   ```

**During Shift (Sales):**
1. Customer buys 10L Petrol for Rs. 2850
2. Sale recorded → Nozzle 1 lastReading: 15000.50 → 15010.50
3. Customer buys 20L Diesel for Rs. 5400
4. Sale recorded → Nozzle 2 lastReading: 12000.75 → 12020.75

**Evening Shift End (8:00 PM):**
1. Operator clicks "End Shift"
2. System shows closing reading form:
   - Nozzle 1: Opening 15000.50, Enter Closing: ___
   - Nozzle 2: Opening 12000.75, Enter Closing: ___
3. Operator enters physical readings:
   - Nozzle 1: 15010.50
   - Nozzle 2: 12020.75
4. System validates: 15010.50 >= 15000.50 ✓, 12020.75 >= 12000.75 ✓
5. System updates Nozzle lastReading:
   - Nozzle 1: 15010.50
   - Nozzle 2: 12020.75
6. System calculates sold:
   - Nozzle 1: 15010.50 - 15000.50 = 10L
   - Nozzle 2: 12020.75 - 12000.75 = 20L
7. System stores endReadings JSON:
   ```json
   [
     {"nozzle": "Nozzle 1", "opening": 15000.50, "closing": 15010.50, "sold": 10, "product": "Petrol"},
     {"nozzle": "Nozzle 2", "opening": 12000.75, "closing": 12020.75, "sold": 20, "product": "Diesel"}
   ]
   ```
8. System updates Shift:
   - closerId: operator's userId
   - status: CLOSED
   - endTime: 2026-01-15 20:00:00
9. System generates sales summary:
   - Total Sales: Rs. 8250
   - Cash: Rs. 8250
   - Credit: Rs. 0
10. WhatsApp notification sent:
    ```
    🏁 Shift Closed 🏁
    By: operator1
    
    Closing Readings:
    Nozzle 1 (Petrol):
      Opening: 15000.50L
      Closing: 15010.50L
      Sold: 10L
    
    Nozzle 2 (Diesel):
      Opening: 12000.75L
      Closing: 12020.75L
      Sold: 20L
    
    Sales Summary:
    Total: Rs. 8250
    Cash: Rs. 8250
    Credit: Rs. 0
    
    On: 15 Jan 2026 08:00 PM
    ```

### **Auto-Close Shift at Midnight**

**Scenario:** Auto-close enabled, shift open at 11:59 PM

1. Cron job triggers at 12:00 AM
2. System checks NotificationPreferences.autoCloseShift = true
3. System finds open shift (started at 8:00 AM)
4. System gets current nozzle readings:
   - Nozzle 1: 15050.25L
   - Nozzle 2: 12080.50L
5. System auto-closes shift with these readings
6. WhatsApp notification sent (shift closed)
7. System waits 2 seconds
8. System auto-starts new shift
9. WhatsApp notification sent (shift started)
10. New shift begins with readings:
    - Nozzle 1: 15050.25L
    - Nozzle 2: 12080.50L

### **Credit Sale with Date Tracking**

**Day 1 (15 Jan 2026):**
1. Customer "Ali" buys 50L Petrol on credit (Rs. 14250)
2. System creates/updates CreditCustomer:
   - name: Ali
   - vehicleNumber: ABC-123
   - totalCredit: 14250
3. System creates CreditRecord:
   - customerId: Ali's ID
   - amount: 14250
   - remainingAmount: 14250
   - creditDate: 2026-01-15
4. Dashboard shows "Today's Credit: Rs. 14250"
5. WhatsApp notification sent

**Day 2 (16 Jan 2026):**
1. Ali pays Rs. 5000
2. System finds oldest credit (FIFO): 2026-01-15 record
3. System updates CreditRecord:
   - remainingAmount: 14250 - 5000 = 9250
4. System updates CreditCustomer:
   - totalCredit: 9250
5. Dashboard shows "Today's Credit: Rs. 0" (no new credit today)
6. Ali buys another 30L on credit (Rs. 8550)
7. System creates new CreditRecord:
   - amount: 8550
   - remainingAmount: 8550
   - creditDate: 2026-01-16
8. Dashboard shows "Today's Credit: Rs. 8550" (only today's record)
9. CreditCustomer totalCredit: 9250 + 8550 = 17800

### **Stock Change with Notifications**

**Purchase Scenario:**
1. Manager records stock purchase: 5000L Petrol for Rs. 1,350,000
2. System updates Tank currentStock: 2000L → 7000L
3. System checks NotificationPreferences.stockNotifications = true
4. WhatsApp notification sent:
   ```
   📦 Stock Purchase 📦
   Purchase By: manager1
   Quantity: 5000L
   Amount: Rs. 1350000
   Now Available: 7000L
   Tank: Tank 1
   On: 15 Jan 2026 02:30 PM
   ```

**Dip Adjustment Scenario:**
1. Manager measures physical stock: 6950L (system shows 7000L)
2. Variance: -50L (shortage)
3. System adjusts Tank currentStock: 7000L → 6950L
4. WhatsApp notification sent:
   ```
   📦 Stock Adjustment 📦
   Adjustment By: manager1
   Quantity: -50L
   Amount: Rs. 0
   Now Available: 6950L
   Tank: Tank 1
   On: 15 Jan 2026 06:00 PM
   ```

---

## 8. Data Retention & Audit Trail

**Permanent Records:**
- All Shift records with startReadings and endReadings (never deleted)
- All Transaction records (double-entry accounting, never deleted)
- All NozzleReading records (audit trail, never deleted)
- All CreditRecord records (payment history, never deleted)
- All TankDip records (physical measurements, never deleted)

**Audit Capabilities:**
1. **Shift History**: View any past shift with exact nozzle readings at start/end
2. **Sales Tracking**: Every sale linked to shift, nozzle, and user
3. **Credit History**: Track when credit was given and when paid (FIFO)
4. **Stock Movements**: Every purchase, sale, and adjustment recorded
5. **User Actions**: Every shift start/end, sale, and adjustment logged with userId

**Reports Available:**
- Daily sales summary by shift
- Nozzle-wise sales with variance detection
- Credit customer ledger with date-wise breakdown
- Stock movement history with physical vs system comparison
- User activity logs with timestamps
- Auto-created when WhatsApp connects
- Updated via `/whatsapp` page

**Fields:**
- `phoneNumber`: WhatsApp number
- `salesNotifications`: Enable/disable sales alerts
- `stockNotifications`: Enable/disable stock alerts
- `notifyCash/Card/Online/Credit`: Per-method toggles
- `minCashAmount/etc`: Minimum amounts to notify

**Used by:**
- **WhatsApp Module**: Check if notification should be sent
- **Sales Module**: Check notification preferences
- **Inventory Module**: Check stock notification settings

**Preferences Flow:**
1. WhatsApp connects → Creates default preferences
2. User updates settings → Saves to NotificationPreferences
3. Event happens → System checks preferences before sending notification

---

## Module Responsibilities

### **Auth Module**
- Manages User table
- Handles login/logout
- JWT token generation

### **Shifts Module**
- Manages Shift and NozzleReading tables
- Start/end shifts
- Calculate shift summaries

### **Inventory Module**
- Manages Product, Tank, Nozzle, TankDip tables
- Stock purchases
- Physical stock adjustments

### **Sales Module**
- Creates Transaction records
- Manages CreditCustomer and CreditRecord tables
- Deducts tank stock
- Updates nozzle readings

### **Accounting Module**
- Manages Account table
- Creates Transaction records
- Updates account balances
- Double-entry bookkeeping

### **Reports Module**
- Reads all tables
- Generates dashboard summary
- Creates financial reports

### **WhatsApp Module**
- Manages NotificationQueue and NotificationPreferences tables
- Sends notifications
- Processes message queue

### **Users Module**
- Manages User table (CRUD)
- Admin-only access

### **Payment Accounts Module**
- Manages PaymentAccount table
- Admin/Manager access

---

## Data Flow Examples

### **Example 1: Recording a Cash Sale**
1. User selects nozzle, enters amount → **Sales Page**
2. System checks shift is open → **Shift Table**
3. System checks tank has stock → **Tank Table**
4. System deducts stock from tank → **Tank Table** (currentStock decreases)
5. System increments nozzle reading → **Nozzle Table** (lastReading increases)
6. System creates accounting transaction → **Transaction Table** (Debit: Cash, Credit: Sales)
7. System sends WhatsApp notification → **NotificationQueue Table**

### **Example 2: Recording a Credit Sale**
1. User selects nozzle, enters amount, chooses CREDIT → **Sales Page**
2. System creates/updates customer → **CreditCustomer Table** (totalCredit increases)
3. System creates credit record → **CreditRecord Table** (amount, remainingAmount, creditDate = today)
4. System deducts stock → **Tank Table**
5. System increments nozzle reading → **Nozzle Table**
6. System creates transaction → **Transaction Table** (Debit: Accounts Receivable, Credit: Sales)
7. Dashboard shows today's credit → Reads **CreditRecord Table** (only today's records)

### **Example 3: Clearing Credit**
1. User checks "Clear Credit" → **Sales Page**
2. System shows customers with credit → **CreditCustomer Table** (totalCredit > 0)
3. User selects customer, enters amount → **Sales Page**
4. System finds oldest unpaid credits (FIFO) → **CreditRecord Table**
5. System updates credit records → **CreditRecord Table** (remainingAmount decreases)
6. System updates customer total → **CreditCustomer Table** (totalCredit decreases)
7. System creates transaction → **Transaction Table** (Debit: Cash, Credit: Accounts Receivable)
8. If credit was from today → Dashboard credit decreases

### **Example 4: Starting a Shift**
1. User clicks "Start Shift" → **Shifts Page**
2. System creates shift record → **Shift Table** (status: OPEN, openerId: current user)
3. System gets all nozzles → **Nozzle Table**
4. System creates nozzle readings → **NozzleReading Table** (openingReading = current lastReading)

### **Example 5: Purchasing Stock**
1. Manager enters purchase details → **Inventory Page**
2. System increases tank stock → **Tank Table** (currentStock increases)
3. System creates accounting transaction → **Transaction Table** (Debit: Inventory, Credit: Payable)
4. System sends WhatsApp notification → **NotificationQueue Table**

---

## Dashboard Data Sources

**Today's Sales:**
- Source: **Transaction Table**
- Filter: creditAccount = "Fuel Sales" AND createdAt >= today midnight
- Calculation: Sum of all transaction amounts

**Today's Credit:**
- Source: **CreditRecord Table**
- Filter: creditDate >= today midnight AND creditDate < tomorrow midnight
- Calculation: Sum of remainingAmount (only today's credit records)

**Active Shift:**
- Source: **Shift Table**
- Filter: status = "OPEN"
- Shows: Shift ID and start time

**Low Stock Count:**
- Source: **Tank Table**
- Filter: (currentStock / capacity) * 100 < 20%
- Calculation: Count of tanks below 20%

**Sales Trend (7 Days):**
- Source: **Transaction Table**
- Filter: creditAccount = "Fuel Sales" AND createdAt >= 7 days ago
- Calculation: Daily sum of sales amounts

---

## Important Notes

1. **Credit System**: Uses date-based tracking. Today's dashboard credit only shows credit given TODAY that hasn't been paid yet.

2. **Double-Entry Accounting**: Every transaction has both debit and credit entries, maintaining accounting balance.

3. **FIFO Credit Payment**: When customer pays, oldest credits are paid first (First In, First Out).

4. **Shift-Based Operations**: Sales can only be recorded during an open shift.

5. **Stock Management**: Tank stock is automatically managed - decreases on sales, increases on purchases, adjusted on dip readings.

6. **WhatsApp Notifications**: All notifications are queued and processed asynchronously to prevent blocking.

7. **Role-Based Access**: Different user roles have different permissions for accessing and modifying data.

---

*Last Updated: Based on current codebase implementation*
