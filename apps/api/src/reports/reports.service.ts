import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getLedger(accountId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      OR: [{ debitAccountId: accountId }, { creditAccountId: accountId }],
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    return {
      account,
      transactions,
    };
  }

  // ... existing methods ...

  async getBalanceSheet() {
    const accounts = await this.prisma.account.findMany();

    // Calculate dynamic inventory value
    const tanks = await this.prisma.tank.findMany({
      include: { product: true },
    });
    const fuelInventoryValue = tanks.reduce((sum, t) => {
      return sum + Number(t.currentStock) * Number(t.product.purchasePrice);
    }, 0);

    const assetAccounts = accounts.filter((a) => a.type === AccountType.ASSET);
    const liabilityAccounts = accounts.filter(
      (a) => a.type === AccountType.LIABILITY,
    );
    const equityAccounts = accounts.filter(
      (a) => a.type === AccountType.EQUITY,
    );
    const income = accounts.filter((a) => a.type === AccountType.INCOME);
    const expenses = accounts.filter((a) => a.type === AccountType.EXPENSE);

    const assets: Record<string, number> = {};
    const liabilities: Record<string, number> = {};
    const equity: Record<string, number> = {};

    assetAccounts.forEach((a) => {
      // Overwrite 'Fuel Inventory' with dynamic value if it exists, or just valid accounting
      // Ideally, the accounting system should be in sync, but for "Real Time" value:
      if (a.code === '10401') {
        // Fuel Inventory
        assets[a.name] = fuelInventoryValue;
      } else {
        assets[a.name] = Number(a.balance);
      }
    });
    // If 10401 doesn't exist, maybe add it? For now assume it exists.

    // ... rest of logic
    // (Re-implementing the rest to ensure variables are in scope)

    liabilityAccounts.forEach((a) => {
      liabilities[a.name] = Number(a.balance);
    });

    equityAccounts.forEach((a) => {
      equity[a.name] = Number(a.balance);
    });

    const totalAssets = Object.values(assets).reduce((s, v) => s + v, 0);
    const totalLiabilities = Object.values(liabilities).reduce(
      (s, v) => s + v,
      0,
    );
    const totalEquity = Object.values(equity).reduce((s, v) => s + v, 0);

    const netProfit =
      income.reduce((sum, a) => sum + Number(a.balance), 0) -
      expenses.reduce((sum, a) => sum + Number(a.balance), 0);

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      netProfit,
      isBalanced: totalAssets === totalLiabilities + totalEquity + netProfit, // Might differ if dynamic inventory differs from book value
    };
  }

  // ... existing getProfitLoss ...

  // NEW REPORTS

  async getSalesReport(
    startDate?: Date,
    endDate?: Date,
    viewMode?: string,
    shiftId?: string,
    nozzleId?: string,
    productId?: string,
  ) {
    const where: any = {
      creditAccount: { code: '40101' }, // Fuel Sales
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (shiftId) where.shiftId = shiftId;
    if (nozzleId) where.nozzleId = nozzleId;
    if (productId) where.productId = productId;

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        shift: { include: { opener: { select: { username: true } } } },
        nozzle: true,
        product: true,
        createdBy: { select: { username: true } },
        customer: true,
        paymentAccount: true,
        debitAccount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary Calculations
    const totalCustomers = transactions.length;

    const fuelTypeMap = new Map<string, { quantity: number; amount: number }>();
    const nozzleMap = new Map<string, { quantity: number; amount: number }>();
    const paymentMethodMap = new Map<
      string,
      { count: number; amount: number }
    >();

    const records = transactions.map((t) => {
      const amount = Number(t.amount);
      const qty = Number(t.quantity || 0);
      const fuelName = t.product?.name || 'Unknown';
      const nozzleName = t.nozzle?.name || 'Unknown';

      // Fuel Type Summary
      const fuelTotal = fuelTypeMap.get(fuelName) || { quantity: 0, amount: 0 };
      fuelTotal.quantity += qty;
      fuelTotal.amount += amount;
      fuelTypeMap.set(fuelName, fuelTotal);

      // Nozzle Summary
      const nozzleTotal = nozzleMap.get(nozzleName) || {
        quantity: 0,
        amount: 0,
      };
      nozzleTotal.quantity += qty;
      nozzleTotal.amount += amount;
      nozzleMap.set(nozzleName, nozzleTotal);

      // Payment Method Summary
      let method = 'CASH';
      if (t.debitAccount?.code === '10301') method = 'CREDIT';
      else if (t.paymentAccount) method = t.paymentAccount.type; // CARD or ONLINE

      const methodTotal = paymentMethodMap.get(method) || {
        count: 0,
        amount: 0,
      };
      methodTotal.count += 1;
      methodTotal.amount += amount;
      paymentMethodMap.set(method, methodTotal);

      // Paid To Logic
      let paidTo = t.createdBy?.username || 'Unknown';
      if (method === 'CREDIT') paidTo = `Credit (${paidTo})`;
      else if (t.paymentAccount)
        paidTo = `${t.paymentAccount.name}${t.paymentAccount.accountNumber ? ` - ${t.paymentAccount.accountNumber}` : ''}`;

      return {
        id: t.id,
        date: t.createdAt,
        name: t.customer?.name || 'Customer',
        vehicleNo: t.customer?.vehicleNumber || '---',
        nozzle: nozzleName,
        fuel: fuelName,
        quantity: qty,
        amount: amount,
        method: method,
        paidTo: paidTo,
        shift: t.shift?.opener?.username || 'Unknown',
        shiftId: t.shiftId,
      };
    });

    return {
      summary: {
        totalCustomers,
        fuelTypeTotals: Array.from(fuelTypeMap.entries()).map(
          ([name, data]) => ({ name, ...data }),
        ),
        nozzlewiseTotals: Array.from(nozzleMap.entries()).map(
          ([nozzle, data]) => ({ nozzle, ...data }),
        ),
        paymentMethodTotals: Array.from(paymentMethodMap.entries()).map(
          ([method, data]) => ({ method, ...data }),
        ),
      },
      records,
    };
  }

  async getPurchaseReport(
    startDate?: Date,
    endDate?: Date,
    supplierId?: string,
    paymentStatus?: string,
    productId?: string,
  ) {
    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      where.status = paymentStatus; // Use 'status' field from schema
    }

    if (productId) {
      where.tank = {
        productId: productId,
      };
    }

    const purchases = await this.prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        tank: { include: { product: true } },
      },
      orderBy: { date: 'desc' },
    });

    return purchases.map((p) => {
      const totalCost = Number(p.totalCost);
      const paidAmount = Number(p.paidAmount || 0);
      return {
        id: p.id,
        date: p.date,
        supplier: p.supplier.name,
        product: p.tank.product.name,
        tank: p.tank.name,
        quantity: Number(p.quantity),
        rate: Number(p.rate), // Use 'rate' field from schema
        totalCost: totalCost,
        paidAmount: paidAmount,
        remainingAmount: totalCost - paidAmount,
        paymentStatus: p.status, // Return as paymentStatus for frontend
      };
    });
  }

  async getSupplierLedger(
    supplierId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    if (supplierId === 'ALL') {
      const suppliers = await this.prisma.supplier.findMany();
      const allLedger: any[] = [];
      let totalBalance = 0;

      for (const supplier of suppliers) {
        const purchases = await this.prisma.purchase.findMany({
          where: {
            supplierId: supplier.id,
            date: { gte: startDate, lte: endDate },
          },
          include: { tank: true },
        });

        const transactions = await this.prisma.transaction.findMany({
          where: {
            supplierId: supplier.id,
            createdAt: { gte: startDate, lte: endDate },
          },
          include: { debitAccount: true, creditAccount: true },
        });

        const sorted = [
          ...purchases.map((p) => ({
            date: p.date,
            type: 'PURCHASE',
            description: `Purchase for ${p.tank?.name || 'Tank'} (${supplier.name})`,
            debit: 0,
            credit: Number(p.totalCost),
            refId: p.id,
          })),
          ...transactions.map((t) => ({
            date: t.createdAt,
            type: 'PAYMENT',
            description: `${t.description} (${supplier.name})`,
            debit: Number(t.amount),
          })),
        ];

        allLedger.push(...sorted);
        totalBalance += Number(supplier.balance);
      }

      return {
        supplier: { name: 'All Suppliers' },
        ledger: allLedger.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
        closingBalance: totalBalance,
      };
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) throw new Error('Supplier not found');

    // Get purchases and payments
    const purchases = await this.prisma.purchase.findMany({
      where: {
        supplierId,
        date: { gte: startDate, lte: endDate },
      },
      include: { tank: true },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: {
        supplierId, // We added this relation
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { debitAccount: true, creditAccount: true },
    });

    // Merge and sort
    const ledger = [
      ...purchases.map((p) => ({
        date: p.date,
        type: 'PURCHASE',
        description: `Purchase for ${p.tank?.name || 'Tank'}`,
        debit: 0,
        credit: Number(p.totalCost), // Current Liability increases (Credit)
        refId: p.id,
      })),
      ...transactions.map((t) => ({
        date: t.createdAt,
        type: 'PAYMENT',
        description: t.description,
        debit: Number(t.amount), // Liability decreases (Debit)
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      supplier,
      ledger,
      closingBalance: Number(supplier.balance),
    };
  }

  async getCustomerLedger(
    customerId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    if (customerId === 'ALL') {
      const customers = await this.prisma.creditCustomer.findMany();
      const allLedger: any[] = [];
      let totalBalance = 0;

      for (const customer of customers) {
        const creditRecords = await this.prisma.creditRecord.findMany({
          where: {
            customerId: customer.id,
            creditDate: { gte: startDate, lte: endDate },
          },
        });

        const payments = await this.prisma.transaction.findMany({
          where: {
            OR: [
              { customerId: customer.id },
              { description: { contains: customer.name } },
            ],
            createdAt: { gte: startDate, lte: endDate },
          },
        });

        const sorted = [
          ...creditRecords.map((r) => ({
            date: r.creditDate,
            type: 'CREDIT_TAKEN',
            description: `Credit Usage (${customer.name})`,
            debit: Number(r.amount),
            credit: 0,
            refId: r.id,
          })),
          ...payments.map((p) => ({
            date: p.createdAt,
            type: 'PAYMENT',
            description: `${p.description} (${customer.name})`,
            debit: 0,
            credit: Number(p.amount),
            refId: p.id,
          })),
        ];

        allLedger.push(...sorted);
        totalBalance += Number(customer.totalCredit);
      }

      return {
        customer: { name: 'All Customers' },
        ledger: allLedger.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
        currentBalance: totalBalance,
      };
    }

    const customer = await this.prisma.creditCustomer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new Error('Customer not found');

    // Credit Records (Usage)
    const creditRecords = await this.prisma.creditRecord.findMany({
      where: {
        customerId,
        creditDate: { gte: startDate, lte: endDate },
      },
    });

    // Payments (Transactions where customerId is set - New!)
    // OR Transactions where creditAccount is 'Accounts Receivable' and description matches?
    // No, we added customerId relation.
    const payments = await this.prisma.transaction.findMany({
      where: {
        OR: [{ customerId }, { description: { contains: customer.name } }],
        createdAt: { gte: startDate, lte: endDate },
      },
      // Typically Payment: Debit Cash, Credit A/R.
    });
    console.log(
      `Found ${payments.length} payments for customer ${customer.name}`,
    );

    const ledger = [
      ...creditRecords.map((r) => ({
        date: r.creditDate,
        type: 'CREDIT_TAKEN', // Asset increases (Debit)
        description: 'Credit Usage',
        debit: Number(r.amount),
        credit: 0,
        refId: r.id,
      })),
      ...payments.map((p) => ({
        date: p.createdAt,
        type: 'PAYMENT', // Asset decreases (Credit)
        description: p.description,
        debit: 0,
        credit: Number(p.amount),
        refId: p.id,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance? Customer has 'totalCredit'.
    // This is basically "How much they owe us" (Asset).

    return {
      customer,
      ledger,
      currentBalance: Number(customer.totalCredit),
    };
  }

  async getTrialBalance() {
    const accounts = await this.prisma.account.findMany();
    const trialBalance = accounts.map((a) => {
      const bal = Number(a.balance);
      const isDebitNature = a.type === 'ASSET' || a.type === 'EXPENSE';

      return {
        code: a.code,
        name: a.name,
        type: a.type,
        debit: isDebitNature ? bal : 0,
        credit: !isDebitNature ? bal : 0,
      };
    });

    const totalDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
    const totalCredit = trialBalance.reduce((s, a) => s + a.credit, 0);

    return {
      accounts: trialBalance,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01, // Floating point tolerance
    };
  }
  async getProfitLoss(startDate?: Date, endDate?: Date) {
    // Re-using Balance Sheet logic but focused on P&L
    // Ideally extract common logic
    const accounts = await this.prisma.account.findMany();
    const income = accounts.filter((a) => a.type === AccountType.INCOME);
    const expenses = accounts.filter((a) => a.type === AccountType.EXPENSE);

    const totalIncome = income.reduce((sum, a) => sum + Number(a.balance), 0);
    const totalExpense = expenses.reduce(
      (sum, a) => sum + Number(a.balance),
      0,
    );

    return {
      income: totalIncome,
      expense: totalExpense,
      netProfit: totalIncome - totalExpense,
    };
  }

  async getDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 1. Shifts Open
    const shifts = await this.prisma.shift.findMany({
      where: { status: 'OPEN' },
    });

    // 2. Today's Sales & Credit Sales
    const todaysShifts = await this.prisma.shift.findMany({
      where: { startTime: { gte: today, lt: tomorrow } },
      include: { transactions: { include: { debitAccount: true } } },
    });

    let todaySales = 0;
    let creditSales = 0;

    for (const s of todaysShifts) {
      const salesTx = s.transactions.filter(
        (t) => t.description?.includes('Sale') || Number(t.amount) > 0,
      );
      const sales = salesTx.reduce((sum, t) => sum + Number(t.amount), 0);
      todaySales += sales;

      const creditTx = salesTx.filter(
        (t) =>
          t.debitAccount?.code === '10301' ||
          t.debitAccount?.name === 'Accounts Receivable',
      );
      creditSales += creditTx.reduce((sum, t) => sum + Number(t.amount), 0);
    }

    // 3. Low Stock Count
    const tanks = await this.prisma.tank.findMany({
      include: { product: true },
    });
    const lowStockCount = tanks.filter((t) => {
      const pct = (Number(t.currentStock) / Number(t.capacity)) * 100;
      return pct < 20; // Hardcoded 20% or fetch from prefs
    }).length;

    // 4. Today Profit (Estimate: Sales - COGS)
    // COGS = Quantity Sold * Purchase Price
    // We need nozzle readings for quantity sold.
    const shiftIds = todaysShifts.map((s) => s.id);
    const readings = await this.prisma.nozzleReading.findMany({
      where: { shiftId: { in: shiftIds } },
      include: {
        nozzle: { include: { tank: { include: { product: true } } } },
      },
    });

    let totalCost = 0;
    for (const r of readings) {
      const sold = Number(r.closingReading) - Number(r.openingReading);
      if (sold > 0) {
        const cost = sold * Number(r.nozzle.tank.product.purchasePrice);
        totalCost += cost;
      }
    }

    const todayProfit = todaySales - totalCost; // Simple Gross Profit

    // 5. Trend Data (Last 7 Days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const last7DaysShifts = await this.prisma.shift.findMany({
      where: { startTime: { gte: sevenDaysAgo, lt: tomorrow } },
      include: { transactions: true },
      orderBy: { startTime: 'asc' },
    });

    // Group by date
    const trendMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateKey = d.toISOString().split('T')[0];
      trendMap.set(dateKey, 0);
    }

    for (const shift of last7DaysShifts) {
      const dateKey = new Date(shift.startTime).toISOString().split('T')[0];
      const salesAmount = shift.transactions
        .filter((t) => t.description?.includes('Sale') || Number(t.amount) > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      if (trendMap.has(dateKey)) {
        trendMap.set(dateKey, trendMap.get(dateKey)! + salesAmount);
      }
    }

    const trend = Array.from(trendMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));

    // 6. Inventory Data (Tank Levels)
    const inventory = tanks.map((t) => ({
      name: t.name,
      product: t.product?.name || 'Unknown',
      current: Number(t.currentStock),
      capacity: Number(t.capacity),
      level: (Number(t.currentStock) / Number(t.capacity)) * 100,
    }));

    return {
      shiftsOpen: shifts.length,
      activeShift:
        shifts.length > 0 ? { startedAt: shifts[0].startTime } : null,
      todaySales,
      todayProfit,
      creditSales,
      lowStockCount,
      trend,
      inventory,
    };
  }

  async getDailySaleSummary(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        transactions: { include: { creditAccount: true, debitAccount: true } },
      },
    });

    if (!shift) return { totalSales: 0, cashSales: 0, creditSales: 0 };

    const salesTx = shift.transactions.filter(
      (t) => t.description?.includes('Sale') || Number(t.amount) > 0,
    );
    // Ideally filter by account type INCOME or specific Sales account

    const totalSales = salesTx.reduce((s, t) => s + Number(t.amount), 0);

    // Cash Sales: Debit Cash (Asset), Credit Sales (Income).
    // In our transaction: debitAccount is Cash, creditAccount is Sales.
    // We can check if creditAccount.name === 'Fuel Sales' mainly.
    // And payment mode?
    // Actually, we can check `description` if it says "Cash Sale" vs "Credit Sale" or look at debit account.
    // If Debit Account is "Cash in Hand", it's Cash Sale.
    // If Debit Account is "Accounts Receivable", it's Credit Sale.

    // Let's assume we can fetch accounts to check IDs or codes, but for now we look at patterns or just sum everything as total if we can't distinguish easily without more queries.
    // However, ShiftsService expects breakdown.

    // Simple heuristic based on current implementation:
    // We might not have easy way to distinguish without account codes.
    // Let's try to do it right:

    let cashSales = 0;
    let creditSales = 0;

    for (const t of salesTx) {
      // We need to know debit account type.
      // We only included creditAccount.
      // Let's include debitAccount too in the query above.
      // Actually, simpler:
      // If we assume `10101` is Cash ...
      // We need to wait for the include to be updated.
    }

    // Re-fetching with correct include
    // The previous fetch already includes both debitAccount and creditAccount.
    // So we can use `shift.transactions` directly.
    const txs = shift.transactions || [];

    cashSales = txs
      .filter((t) => t.debitAccount?.code === '10101') // Cash in Hand
      .reduce((s, t) => s + Number(t.amount), 0);

    creditSales = txs
      .filter(
        (t) =>
          t.debitAccount?.code === '10301' ||
          t.debitAccount?.name === 'Accounts Receivable',
      )
      .reduce((s, t) => s + Number(t.amount), 0);

    return { totalSales, cashSales, creditSales };
  }
}
