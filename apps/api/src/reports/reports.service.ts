import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Helper to format shift names
  private formatShiftName(shift: any): string {
    if (!shift || !shift.startTime) return 'Unknown';
    const date = new Date(shift.startTime);
    const hours = date.getHours();
    const period = hours < 12 ? 'M' : 'N';
    const dateStr = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${dateStr} ${period}`;
  }

  // Helper to format date
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // Helper to format time
  private formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

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
      assets[a.name] = Number(a.balance);
    });

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
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity + netProfit,
      netProfit,
      isBalanced:
        Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)) <
        1,
      explanation: {
        assets: 'What the business owns (Cash, Bank, Inventory, Equipment)',
        liabilities:
          'What the business owes (Supplier debts, Customer advances)',
        equity: 'Owner investment and retained earnings',
        formula: 'Assets = Liabilities + Equity + Net Profit',
      },
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
    paymentType?: string,
  ) {
    // Default to DETAILED_SALES if not specified
    const mode = viewMode || 'DETAILED_SALES';

    // Get base transaction data
    const baseData = await this.getDetailedSalesReport(
      startDate,
      endDate,
      shiftId,
      nozzleId,
      productId,
      paymentType,
    );

    // Return based on view mode
    switch (mode) {
      case 'DETAILED_SALES':
        return baseData;

      case 'DAILY_SUMMARY':
        return this.aggregateDailySummary(baseData.records);

      case 'SHIFT_WISE':
        return this.aggregateShiftWise(baseData.records, startDate, endDate);

      case 'NOZZLE_WISE':
        return this.aggregateNozzleWise(startDate, endDate, shiftId);

      case 'NOZZLE_READINGS':
        return this.getNozzleReadings(startDate, endDate, shiftId, nozzleId);

      default:
        return baseData;
    }
  }

  private aggregateDailySummary(records: any[]) {
    const dailyMap = new Map<string, any>();

    records.forEach((r) => {
      const date = new Date(r.date);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: date.toISOString(),
          quantitySold: 0,
          cashSales: 0,
          creditSales: 0,
          cardSales: 0,
          onlineSales: 0,
          totalSales: 0,
          profit: 0,
        });
      }
      const day = dailyMap.get(dateKey);
      day.quantitySold += r.quantity;
      day.totalSales += r.amount;
      if (r.method === 'CASH') day.cashSales += r.amount;
      else if (r.method === 'CREDIT') day.creditSales += r.amount;
      else if (r.method === 'CARD') day.cardSales += r.amount;
      else if (r.method === 'ONLINE') day.onlineSales += r.amount;
    });

    return {
      summary: {
        totalCustomers: records.length,
        fuelTypeTotals: [],
        nozzlewiseTotals: [],
        paymentMethodTotals: [],
      },
      records: Array.from(dailyMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };
  }

  private async aggregateShiftWise(
    records: any[],
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {};
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.startTime.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.startTime.lte = end;
      }
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      include: { opener: true },
      orderBy: { startTime: 'desc' },
    });

    const shiftRecords = shifts.map((s) => {
      const shiftTxs = records.filter((r) => r.shiftId === s.id);
      return {
        id: s.id,
        shiftName: this.formatShiftName(s),
        operator: s.opener?.username || 'Unknown',
        startTime: s.startTime,
        endTime: s.endTime,
        totalSales: shiftTxs.reduce((sum, t) => sum + t.amount, 0),
        quantitySold: shiftTxs.reduce((sum, t) => sum + t.quantity, 0),
        profit: 0,
      };
    });

    return {
      summary: {
        totalCustomers: records.length,
        fuelTypeTotals: [],
        nozzlewiseTotals: [],
        paymentMethodTotals: [],
      },
      records: shiftRecords,
    };
  }

  private async aggregateNozzleWise(
    startDate?: Date,
    endDate?: Date,
    shiftId?: string,
  ) {
    const where: any = {};
    if (shiftId) where.shiftId = shiftId;
    if (startDate || endDate) {
      where.shift = { startTime: {} };
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.shift.startTime.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.shift.startTime.lte = end;
      }
    }

    const readings = await this.prisma.nozzleReading.findMany({
      where,
      include: {
        nozzle: { include: { tank: { include: { product: true } } } },
        shift: { include: { opener: true } },
      },
    });

    const nozzleRecords = readings.map((r) => ({
      nozzle: r.nozzle.name,
      product: r.nozzle.tank.product.name,
      shiftName: this.formatShiftName(r.shift),
      openingReading: Number(r.openingReading),
      closingReading: Number(r.closingReading || r.openingReading),
      sale:
        Number(r.closingReading || r.openingReading) - Number(r.openingReading),
      rate: Number(r.nozzle.tank.product.sellingPrice),
      totalSale:
        (Number(r.closingReading || r.openingReading) -
          Number(r.openingReading)) *
        Number(r.nozzle.tank.product.sellingPrice),
    }));

    return {
      summary: {
        totalCustomers: 0,
        fuelTypeTotals: [],
        nozzlewiseTotals: [],
        paymentMethodTotals: [],
      },
      records: nozzleRecords,
    };
  }

  private async getNozzleReadings(
    startDate?: Date,
    endDate?: Date,
    shiftId?: string,
    nozzleId?: string,
  ) {
    const where: any = {};
    if (shiftId) where.shiftId = shiftId;
    if (nozzleId) where.nozzleId = nozzleId;
    if (startDate || endDate) {
      where.shift = { startTime: {} };
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.shift.startTime.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.shift.startTime.lte = end;
      }
    }

    const readings = await this.prisma.nozzleReading.findMany({
      where,
      include: {
        shift: { include: { opener: true } },
        nozzle: { include: { tank: { include: { product: true } } } },
      },
      orderBy: { shift: { startTime: 'desc' } },
    });

    const records = readings.map((r) => ({
      date: r.shift.startTime,
      shiftId: r.shiftId,
      shiftName: this.formatShiftName(r.shift),
      nozzle: r.nozzle.name,
      product: r.nozzle.tank.product.name,
      openingReading: Number(r.openingReading),
      closingReading: Number(r.closingReading || r.openingReading),
      sold:
        Number(r.closingReading || r.openingReading) - Number(r.openingReading),
      rate: Number(r.nozzle.tank.product.sellingPrice),
      amount:
        (Number(r.closingReading || r.openingReading) -
          Number(r.openingReading)) *
        Number(r.nozzle.tank.product.sellingPrice),
    }));

    return {
      summary: {
        totalCustomers: 0,
        fuelTypeTotals: [],
        nozzlewiseTotals: [],
        paymentMethodTotals: [],
      },
      records,
    };
  }

  private async getDetailedSalesReport(
    startDate?: Date,
    endDate?: Date,
    shiftId?: string,
    nozzleId?: string,
    productId?: string,
    paymentType?: string,
  ) {
    const adjustedEnd = endDate ? new Date(endDate) : undefined;
    if (adjustedEnd) adjustedEnd.setHours(23, 59, 59, 999);

    const where: any = {
      creditAccount: { code: '40101' }, // Fuel Sales
    };

    if (startDate || adjustedEnd) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (adjustedEnd) {
        where.createdAt.lte = adjustedEnd;
      }
    }

    if (shiftId) where.shiftId = shiftId;
    if (nozzleId) where.nozzleId = nozzleId;
    if (productId) where.productId = productId;

    // Payment type filter
    if (paymentType && paymentType !== 'ALL') {
      if (paymentType === 'CASH') {
        where.debitAccount = { code: '10101' };
      } else if (paymentType === 'CREDIT') {
        where.debitAccount = { code: '10301' };
      } else if (paymentType === 'BANK') {
        where.paymentAccountId = { not: null };
      }
    }

    const transactions = (await this.prisma.transaction.findMany({
      where,
      include: {
        shift: { include: { opener: { select: { username: true } } } },
        nozzle: { include: { tank: { include: { product: true } } } },
        product: true,
        createdBy: { select: { username: true } },
        customer: true,
        paymentAccount: true,
        debitAccount: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    })) as any[];

    // Summary Calculations
    const totalCustomers = transactions.length;

    const fuelTypeMap = new Map<string, { quantity: number; amount: number }>();
    const nozzleMap = new Map<string, { quantity: number; amount: number }>();
    const paymentMethodMap = new Map<
      string,
      { count: number; amount: number }
    >();

    let records = transactions.map((t: any) => {
      const amount = Number(t.amount);
      const qty = Number(t.quantity || 0);
      const fuelName = (t as any).product?.name || 'Unknown';
      const nozzleName = (t as any).nozzle?.name || 'Unknown';

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
      if ((t.debitAccount as any)?.code === '10301') {
        method = 'CREDIT';
      } else if (t.paymentAccountId) {
        method = (t.paymentAccount as any)?.type || 'BANK';
      } else if ((t.debitAccount as any)?.code === '10101') {
        method = 'CASH';
      }

      const methodTotal = paymentMethodMap.get(method) || {
        count: 0,
        amount: 0,
      };
      methodTotal.count += 1;
      methodTotal.amount += amount;
      paymentMethodMap.set(method, methodTotal);

      // Paid To Logic
      let paidTo = '-';
      if ((t.debitAccount as any)?.code === '10301') {
        paidTo = 'Account Receivable';
      } else if (t.paymentAccountId) {
        paidTo =
          (t.paymentAccount as any)?.name ||
          (t.paymentAccount as any)?.type ||
          'Bank';
      } else {
        paidTo = 'Cash in Hand';
      }

      return {
        id: t.id,
        date: t.createdAt,
        name: (t as any).customer?.name || 'Customer',
        vehicleNo: (t as any).customer?.vehicleNumber || '---',
        nozzle: nozzleName,
        fuel: fuelName,
        quantity: qty,
        amount: amount,
        method: method,
        paidTo: paidTo,
        shift: this.formatShiftName((t as any).shift),
        shiftId: t.shiftId,
        shiftOpener: (t as any).shift?.opener?.username || 'Unknown',
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
    const adjustedEnd = endDate ? new Date(endDate) : undefined;
    if (adjustedEnd) adjustedEnd.setHours(23, 59, 59, 999);

    const where: any = {};

    if (startDate || adjustedEnd) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (adjustedEnd) where.date.lte = adjustedEnd;
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

    const purchaseRows = purchases.map((p: any) => {
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
    return purchaseRows;
  }

  async getSupplierLedger(
    supplierId: string,
    startDate?: Date,
    endDate?: Date,
    month?: string,
  ) {
    // If month is provided, set date range for that month
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(year, monthNum, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Adjust endDate to end of day if provided
    const adjustedEnd = endDate ? new Date(endDate) : undefined;
    if (adjustedEnd) adjustedEnd.setHours(23, 59, 59, 999);

    if (supplierId === 'ALL') {
      const suppliers = await this.prisma.supplier.findMany({
        where: { isDeleted: false }
      });
      const allLedger: any[] = [];
      const summary: any[] = [];
      let totalBalance = 0;

      for (const supplier of suppliers) {
        // Calculate opening balance up to startDate
        let runningBalance = 0;
        let totalSupplierDebit = 0;
        let totalSupplierCredit = 0;
        if (startDate) {
          const pastPurchases = await this.prisma.purchase.aggregate({
            where: { supplierId: supplier.id, date: { lt: startDate } },
            _sum: { totalCost: true },
          });
          const pastPayments = await this.prisma.transaction.aggregate({
            where: { supplierId: supplier.id, createdAt: { lt: startDate } },
            _sum: { amount: true },
          });
          runningBalance =
            Number(pastPurchases._sum.totalCost || 0) -
            Number(pastPayments._sum.amount || 0);
        }

        const purchases = await this.prisma.purchase.findMany({
          where: {
            supplierId: supplier.id,
            date: { gte: startDate, lte: adjustedEnd },
          },
          include: { tank: { include: { product: true } } },
        });

        const transactions = await this.prisma.transaction.findMany({
          where: {
            supplierId: supplier.id,
            createdAt: { gte: startDate, lte: adjustedEnd },
            debitAccount: { code: '20101' }, // Only actual payments (Accounts Payable debit)
          },
          include: { debitAccount: true, creditAccount: true },
        });

        const sorted = [
          ...purchases.map((p: any) => {
            const totalCost = Number(p.totalCost);
            const paidAmount = Number(p.paidAmount || 0);
            const unpaidAmount = totalCost - paidAmount;

            // Add total purchase amount to credit (total purchased)
            totalSupplierCredit += totalCost;
            // Add immediate payment to debit
            totalSupplierDebit += paidAmount;

            return {
              date: p.date,
              type: 'PURCHASE',
              description: `${p.quantity}L ${p.tank?.product?.name || 'Fuel'} @ Rs. ${p.rate} (${p.tank?.name || 'Tank'})`,
              debit: paidAmount,
              credit: totalCost,
              refId: p.id,
              supplierName: supplier.name,
              details: {
                quantity: Number(p.quantity),
                rate: Number(p.rate),
                totalCost: totalCost,
                paidAmount: paidAmount,
                remainingAmount: unpaidAmount,
                status: p.status,
              },
            };
          }),
          ...transactions.map((t) => {
            totalSupplierDebit += Number(t.amount);
            return {
              date: t.createdAt,
              type: 'PAYMENT',
              description: t.description || `Payment to ${supplier.name}`,
              debit: Number(t.amount),
              credit: Number(t.amount),
              staticPayable: Number(t.quantity || 0), // Stored payable after payment
              refId: t.id,
              supplierName: supplier.name,
            };
          }),
        ].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        // Professional ledger: All rows show current supplier balance
        const currentBalance = Number(supplier.balance);
        const recordsWithBalance = sorted.map((r: any) => {
          return { ...r, runningBalance: currentBalance };
        });

        allLedger.push(...recordsWithBalance);
        // Always use current supplier.balance for total
        totalBalance += Number(supplier.balance);

        summary.push({
          id: supplier.id,
          name: supplier.name,
          contact: supplier.contact || supplier.email || null,
          debit: totalSupplierDebit,
          credit: totalSupplierCredit,
          balance: Number(supplier.balance),
        });
      }

      return {
        supplier: { name: 'All Suppliers' },
        ledger: allLedger,
        summary,
        currentBalance: totalBalance,
        isMonthFiltered: !!month,
      };
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId, isDeleted: false },
    });
    if (!supplier) throw new Error('Supplier not found');

    // Calculate opening balance up to startDate
    let runningBalance = 0;
    if (startDate) {
      const pastPurchases = await this.prisma.purchase.aggregate({
        where: { supplierId, date: { lt: startDate } },
        _sum: { totalCost: true },
      });
      const pastPayments = await this.prisma.transaction.aggregate({
        where: { supplierId, createdAt: { lt: startDate } },
        _sum: { amount: true },
      });
      runningBalance =
        Number(pastPurchases._sum.totalCost || 0) -
        Number(pastPayments._sum.amount || 0);
    }

    const purchases = await this.prisma.purchase.findMany({
      where: {
        supplierId,
        date: { gte: startDate, lte: adjustedEnd },
      },
      include: { tank: { include: { product: true } } },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: {
        supplierId,
        createdAt: { gte: startDate, lte: adjustedEnd },
        debitAccount: { code: '20101' }, // Only actual payments (Accounts Payable debit)
      },
    });

    const sorted = [
      ...purchases.map((p: any) => {
        const totalCost = Number(p.totalCost);
        const paidAmount = Number(p.paidAmount || 0);
        const unpaidAmount = totalCost - paidAmount;

        return {
          date: p.date,
          type: 'PURCHASE',
          description: `${p.quantity}L ${p.tank?.product?.name || 'Fuel'} @ Rs. ${p.rate} (${p.tank?.name || 'Tank'})`,
          debit: paidAmount,
          credit: totalCost,
          refId: p.id,
          supplierName: supplier.name,
          details: {
            quantity: Number(p.quantity),
            rate: Number(p.rate),
            totalCost: totalCost,
            paidAmount: paidAmount,
            remainingAmount: unpaidAmount,
            status: p.status,
          },
        };
      }),
      ...transactions.map((t) => ({
        date: t.createdAt,
        type: 'PAYMENT',
        description: t.description || `Payment to ${supplier.name}`,
        debit: Number(t.amount),
        credit: Number(t.amount),
        staticPayable: Number(t.quantity || 0), // Stored payable after payment
        refId: t.id,
        supplierName: supplier.name,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Professional ledger: All rows show current supplier balance
    const currentBalance = Number(supplier.balance);
    const ledger = sorted.map((r: any) => {
      return { ...r, runningBalance: currentBalance };
    });

    return {
      supplier,
      ledger,
      currentBalance: Number(supplier.balance),
      isMonthFiltered: !!month,
    };
  }

  async getCustomerLedger(
    customerId: string,
    startDate?: Date,
    endDate?: Date,
    month?: string,
  ) {
    // If month is provided, set date range for that month
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(year, monthNum, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Adjust endDate to end of day if provided
    const adjustedEnd = endDate ? new Date(endDate) : undefined;
    if (adjustedEnd) adjustedEnd.setHours(23, 59, 59, 999);

    if (customerId === 'ALL') {
      const customers = await this.prisma.creditCustomer.findMany();
      const allLedger: any[] = [];
      const summary: any[] = [];
      let totalBalance = 0;

      for (const customer of customers) {
        // Calculate opening balance up to startDate
        let runningBalance = 0;
        let totalCustomerDebit = 0;
        let totalCustomerCredit = 0;

        if (startDate) {
          const pastSales = await this.prisma.transaction.aggregate({
            where: {
              customerId: customer.id,
              creditAccount: { code: '40101' },
              debitAccount: { code: '10301' },
              createdAt: { lt: startDate },
            },
            _sum: { amount: true },
          });
          const pastPayments = await this.prisma.transaction.aggregate({
            where: {
              customerId: customer.id,
              creditAccount: { code: '10301' },
              debitAccount: { code: { not: '10301' } },
              createdAt: { lt: startDate },
            },
            _sum: { amount: true },
          });
          runningBalance =
            Number(pastSales._sum.amount || 0) -
            Number(pastPayments._sum.amount || 0);
        }

        const creditTransactions = await this.prisma.transaction.findMany({
          where: {
            customerId: customer.id,
            creditAccount: { code: '40101' },
            debitAccount: { code: '10301' },
            createdAt: { gte: startDate, lte: adjustedEnd },
          },
          include: { product: true, nozzle: true, shift: true },
        });

        const payments = await this.prisma.transaction.findMany({
          where: {
            customerId: customer.id,
            creditAccount: { code: '10301' },
            debitAccount: { code: { not: '10301' } },
            createdAt: { gte: startDate, lte: adjustedEnd },
          },
        });

        const sorted = [
          ...creditTransactions.map((t: any) => {
            totalCustomerCredit += Number(t.amount);
            return {
              date: t.createdAt,
              type: 'CREDIT_SALE',
              description: `${t.quantity || 0}L ${t.product?.name || 'Fuel'} via ${t.nozzle?.name || 'Nozzle'}`,
              debit: 0,
              credit: Number(t.amount),
              refId: t.id,
              customerName: customer.name,
              details: {
                quantity: Number(t.quantity || 0),
                product: t.product?.name,
                nozzle: t.nozzle?.name,
                vehicleNumber: customer.vehicleNumber || '',
                shift: t.shift ? this.formatShiftName(t.shift) : 'Unknown',
                time: this.formatTime(t.createdAt),
              },
            };
          }),
          ...payments.map((p) => {
            totalCustomerDebit += Number(p.amount);
            return {
              date: p.createdAt,
              type: 'PAYMENT',
              description: `Payment received - ${p.description || 'Credit payment'}`,
              debit: Number(p.amount),
              credit: 0,
              refId: p.id,
              customerName: customer.name,
            };
          }),
        ].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        const recordsWithBalance = sorted.map((r) => {
          if (r.type === 'CREDIT_SALE') runningBalance += r.credit;
          else runningBalance -= r.debit;
          return { ...r, runningBalance };
        });

        allLedger.push(...recordsWithBalance);
        // Always use current customer.totalCredit for total
        totalBalance += Number(customer.totalCredit);

        summary.push({
          id: customer.id,
          name: customer.name,
          contact: customer.contact,
          vehicleNumber: customer.vehicleNumber,
          debit: totalCustomerDebit,
          credit: totalCustomerCredit,
          balance: Number(customer.totalCredit),
        });
      }

      return {
        customer: { name: 'All Customers' },
        ledger: allLedger,
        summary,
        currentBalance: totalBalance,
        isMonthFiltered: !!month,
      };
    }

    const customer = await this.prisma.creditCustomer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return {
        customer: null,
        ledger: [],
        currentBalance: 0,
        isMonthFiltered: !!month,
      };
    }

    // Calculate opening balance up to startDate
    let runningBalance = 0;
    if (startDate) {
      const pastSales = await this.prisma.transaction.aggregate({
        where: {
          customerId,
          creditAccount: { code: '40101' },
          debitAccount: { code: '10301' },
          createdAt: { lt: startDate },
        },
        _sum: { amount: true },
      });
      const pastPayments = await this.prisma.transaction.aggregate({
        where: {
          customerId,
          creditAccount: { code: '10301' },
          debitAccount: { code: { not: '10301' } },
          createdAt: { lt: startDate },
        },
        _sum: { amount: true },
      });
      runningBalance =
        Number(pastSales._sum.amount || 0) -
        Number(pastPayments._sum.amount || 0);
    }

    const creditTransactions = await this.prisma.transaction.findMany({
      where: {
        customerId,
        creditAccount: { code: '40101' },
        debitAccount: { code: '10301' },
        createdAt: { gte: startDate, lte: adjustedEnd },
      },
      include: { product: true, nozzle: true, shift: true },
    });

    const payments = await this.prisma.transaction.findMany({
      where: {
        customerId,
        creditAccount: { code: '10301' },
        debitAccount: { code: { not: '10301' } },
        createdAt: { gte: startDate, lte: adjustedEnd },
      },
    });

    const sorted = [
      ...creditTransactions.map((t: any) => ({
        date: t.createdAt,
        type: 'CREDIT_SALE',
        description: `${t.quantity || 0}L ${t.product?.name || 'Fuel'} via ${t.nozzle?.name || 'Nozzle'}`,
        debit: 0,
        credit: Number(t.amount),
        refId: t.id,
        customerName: customer.name,
        details: {
          quantity: Number(t.quantity || 0),
          product: t.product?.name,
          nozzle: t.nozzle?.name,
          vehicleNumber: customer.vehicleNumber || '',
          shift: t.shift ? this.formatShiftName(t.shift) : 'Unknown',
          time: this.formatTime(t.createdAt),
        },
      })),
      ...payments.map((p: any) => ({
        date: p.createdAt,
        type: 'PAYMENT',
        description: `Payment received - ${p.description || 'Credit payment'}`,
        debit: Number(p.amount),
        credit: 0,
        refId: p.id,
        customerName: customer.name,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const ledger = sorted.map((r) => {
      if (r.type === 'CREDIT_SALE') runningBalance += r.credit;
      else runningBalance -= r.debit;
      return { ...r, runningBalance };
    });

    return {
      customer,
      ledger,
      currentBalance: Number(customer.totalCredit),
      isMonthFiltered: !!month,
    };
  }

  async getTrialBalance() {
    const accounts = await this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });

    const trialBalance = accounts.map((a) => {
      const bal = Number(a.balance);
      const isDebitNature = a.type === 'ASSET' || a.type === 'EXPENSE';

      return {
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debit: isDebitNature ? bal : 0,
        credit: !isDebitNature ? bal : 0,
        balance: bal,
      };
    });

    const totalDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
    const totalCredit = trialBalance.reduce((s, a) => s + a.credit, 0);

    // Group by type for better organization
    const grouped = {
      ASSET: trialBalance.filter((a) => a.type === 'ASSET'),
      LIABILITY: trialBalance.filter((a) => a.type === 'LIABILITY'),
      EQUITY: trialBalance.filter((a) => a.type === 'EQUITY'),
      INCOME: trialBalance.filter((a) => a.type === 'INCOME'),
      EXPENSE: trialBalance.filter((a) => a.type === 'EXPENSE'),
    };

    return {
      accounts: trialBalance,
      grouped,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }
  async getProfitLoss(startDate?: Date, endDate?: Date) {
    const adjustedEnd = endDate ? new Date(endDate) : undefined;
    if (adjustedEnd) adjustedEnd.setHours(23, 59, 59, 999);

    const accounts = await this.prisma.account.findMany();
    const income = accounts.filter((a) => a.type === AccountType.INCOME);
    const expenses = accounts.filter((a) => a.type === AccountType.EXPENSE);

    const incomeBreakdown = income.map((a) => ({
      name: a.name,
      code: a.code,
      amount: Number(a.balance),
    }));

    const expenseBreakdown = expenses.map((a) => ({
      name: a.name,
      code: a.code,
      amount: Number(a.balance),
    }));

    const totalIncome = income.reduce((sum, a) => sum + Number(a.balance), 0);
    const totalExpense = expenses.reduce(
      (sum, a) => sum + Number(a.balance),
      0,
    );

    return {
      income: totalIncome,
      expense: totalExpense,
      netProfit: totalIncome - totalExpense,
      incomeBreakdown,
      expenseBreakdown,
      explanation: {
        income: 'Total revenue from fuel sales and other income sources',
        expense:
          'Total costs including fuel purchases, salaries, utilities, etc.',
        netProfit: 'Income minus Expenses = Net Profit (or Loss if negative)',
      },
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

    const todayFuelSaleTx = (await this.prisma.transaction.findMany({
      where: {
        creditAccount: { code: '40101' },
        createdAt: { gte: today, lt: tomorrow },
      },
      include: {
        debitAccount: true,
        nozzle: { include: { tank: { include: { product: true } } } },
      } as any,
    })) as any[];

    const todaySales = todayFuelSaleTx.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    const creditSales = todayFuelSaleTx
      .filter(
        (t) =>
          t.debitAccount?.code === '10301' ||
          t.debitAccount?.name === 'Accounts Receivable',
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalCost = todayFuelSaleTx.reduce((sum, t) => {
      const qty = Number(t.quantity || 0);
      const purchasePrice = Number(t.nozzle?.tank?.product?.purchasePrice || 0);
      return sum + qty * purchasePrice;
    }, 0);
    const todayProfit = todaySales - totalCost;

    // 3. Low Stock Count
    const tanks = await this.prisma.tank.findMany({
      include: { product: true },
    });
    const lowStockCount = tanks.filter((t) => {
      const pct = (Number(t.currentStock) / Number(t.capacity)) * 100;
      return pct < 20;
    }).length;

    // 5. Trend Data (Last 7 Days) — sales only, using fuel-sales account filter
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const trendTx = await this.prisma.transaction.findMany({
      where: {
        creditAccount: { code: '40101' },
        createdAt: { gte: sevenDaysAgo, lt: tomorrow },
      },
    });

    // Group by local date string (YYYY-MM-DD) to avoid timezone shifts
    const trendMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateKey = d.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD reliably
      trendMap.set(dateKey, 0);
    }

    for (const t of trendTx) {
      // Use toLocaleDateString to match local grouped keys in trendMap
      const dateKey = t.createdAt.toLocaleDateString('en-CA');
      if (trendMap.has(dateKey)) {
        trendMap.set(dateKey, trendMap.get(dateKey)! + Number(t.amount));
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
        transactions: {
          include: {
            creditAccount: true,
            debitAccount: true,
            paymentAccount: true,
          },
        },
      },
    });

    if (!shift)
      return {
        totalSales: 0,
        cashSales: 0,
        creditSales: 0,
        cardSales: 0,
        onlineSales: 0,
      };

    const salesTx = shift.transactions.filter(
      (t) => t.description?.includes('Sale') || Number(t.amount) > 0,
    );

    const totalSales = salesTx.reduce((s, t) => s + Number(t.amount), 0);

    const txs = shift.transactions || [];

    const cashSales = txs
      .filter((t) => t.debitAccount?.code === '10101') // Cash in Hand
      .reduce((s, t) => s + Number(t.amount), 0);

    const creditSales = txs
      .filter(
        (t) =>
          t.debitAccount?.code === '10301' ||
          t.debitAccount?.name === 'Accounts Receivable',
      )
      .reduce((s, t) => s + Number(t.amount), 0);

    const cardSales = txs
      .filter((t) => t.paymentAccount?.type === 'CARD')
      .reduce((s, t) => s + Number(t.amount), 0);

    const onlineSales = txs
      .filter((t) => t.paymentAccount?.type === 'ONLINE')
      .reduce((s, t) => s + Number(t.amount), 0);

    return { totalSales, cashSales, creditSales, cardSales, onlineSales };
  }

  async generateInvoice(type: string, id: string): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const now = new Date();
    const formattedDate = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi',
    });

    let entity: any;
    let ledger: any[];

    if (type === 'supplier') {
      const data = await this.getSupplierLedger(id);
      entity = data.supplier;
      ledger = data.ledger;
    } else {
      const data = await this.getCustomerLedger(id);
      entity = data.customer;
      ledger = data.ledger;
    }

    doc.rect(0, 0, doc.page.width, 100).fill('#1e40af');
    doc.fontSize(24).fillColor('#ffffff').font('Helvetica-Bold')
      .text('PETROL PUMP MANAGEMENT', 40, 25, { align: 'center' });
    doc.fontSize(14).fillColor('#93c5fd')
      .text(type === 'supplier' ? 'SUPPLIER INVOICE' : 'CUSTOMER INVOICE', { align: 'center' });
    doc.fontSize(9).fillColor('#e0e7ff')
      .text(`Generated: ${formattedDate}`, 40, 75, { align: 'right' });

    doc.moveDown(3);

    doc.fontSize(12).fillColor('#000').font('Helvetica-Bold')
      .text(type === 'supplier' ? 'Supplier Details' : 'Customer Details', 40);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .fillColor('#000').text(`Name: ${entity.name}`, 40);
    if (entity.contact) {
      doc.text(`Contact: ${entity.contact}`, 40);
    }
    if (entity.email) {
      doc.text(`Email: ${entity.email}`, 40);
    }
    if (entity.vehicleNumber) {
      doc.text(`Vehicle: ${entity.vehicleNumber}`, 40);
    }
    doc.moveDown(1);

    const totalBalance = ledger.length > 0 ? ledger[ledger.length - 1].runningBalance || 0 : 0;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af')
      .text(`Outstanding Balance: Rs. ${totalBalance.toLocaleString()}`, 40);
    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
      .text('Transaction History', 40);
    doc.moveDown(0.5);

    const dateWidth = type === 'customer' ? 80 : 90;
    const descWidth = type === 'customer' ? 250 : 250;
    const debitWidth = 60;
    const creditWidth = 60;
    const balanceWidth = 60;
    let y = doc.y;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text('Date/Time', 40, y, { width: dateWidth, align: 'left' });
    doc.text('Description', 40 + dateWidth, y, { width: descWidth, align: 'left' });
    doc.text('Debit', 40 + dateWidth + descWidth, y, { width: debitWidth, align: 'right' });
    doc.text('Credit', 40 + dateWidth + descWidth + debitWidth, y, { width: creditWidth, align: 'right' });
    doc.text('Balance', 40 + dateWidth + descWidth + debitWidth + creditWidth, y, { width: balanceWidth, align: 'right' });
    y += 15;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#cbd5e1').lineWidth(1).stroke();
    y += 5;

    doc.fontSize(8).font('Helvetica').fillColor('#000');
    ledger.forEach((row, rowIdx) => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 40;
      }
      const dateTime = new Date(row.date).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      doc.text(dateTime, 40, y, { width: dateWidth, ellipsis: true, lineBreak: false });
      doc.text(row.description || '-', 40 + dateWidth, y, { width: descWidth, ellipsis: true, lineBreak: false });
      doc.text(row.debit > 0 ? row.debit.toLocaleString() : '-', 40 + dateWidth + descWidth, y, { width: debitWidth, align: 'right', ellipsis: true, lineBreak: false });
      doc.text(row.credit > 0 ? row.credit.toLocaleString() : '-', 40 + dateWidth + descWidth + debitWidth, y, { width: creditWidth, align: 'right', ellipsis: true, lineBreak: false });
      doc.text((row.runningBalance || 0).toLocaleString(), 40 + dateWidth + descWidth + debitWidth + creditWidth, y, { width: balanceWidth, align: 'right', ellipsis: true, lineBreak: false });
      y += 12;
      if (rowIdx % 5 === 4) {
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
        y += 3;
      }
    });

    const bottom = doc.page.height - 50;
    doc.fontSize(8).fillColor('#94a3b8')
      .text('PETROL PUMP MANAGEMENT SYSTEM | PROFESSIONAL INVOICE', 40, bottom, { align: 'center' });
    doc.fontSize(7).text('\u00a9 2026 PPMS | Electronically Generated Document', { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }
}
