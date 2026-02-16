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

  async getBalanceSheet() {
    const accounts = await this.prisma.account.findMany();

    const assetAccounts = accounts.filter((a) => a.type === AccountType.ASSET);
    const liabilityAccounts = accounts.filter(
      (a) => a.type === AccountType.LIABILITY,
    );
    const equityAccounts = accounts.filter((a) => a.type === AccountType.EQUITY);
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

    const totalAssets = assetAccounts.reduce(
      (sum, a) => sum + Number(a.balance),
      0,
    );
    const totalLiabilities = liabilityAccounts.reduce(
      (sum, a) => sum + Number(a.balance),
      0,
    );
    const totalEquity = equityAccounts.reduce(
      (sum, a) => sum + Number(a.balance),
      0,
    );

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
      isBalanced: totalAssets === totalLiabilities + totalEquity + netProfit,
    };
  }

  async getProfitLoss(startDate?: Date, endDate?: Date) {
    const incomeAccounts = await this.prisma.account.findMany({
      where: { type: AccountType.INCOME },
    });
    const expenseAccounts = await this.prisma.account.findMany({
      where: { type: AccountType.EXPENSE },
    });

    const income: Record<string, number> = {};
    const expenses: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const acc of incomeAccounts) {
      const txs = await this.prisma.transaction.findMany({
        where: {
          creditAccountId: acc.id,
          ...(startDate || endDate
            ? { createdAt: { gte: startDate, lte: endDate } }
            : {}),
        },
      });
      const amount = txs.reduce((sum, tx) => sum + Number(tx.amount), 0);
      income[acc.name] = amount;
      totalIncome += amount;
    }

    for (const acc of expenseAccounts) {
      const txs = await this.prisma.transaction.findMany({
        where: {
          debitAccountId: acc.id,
          ...(startDate || endDate
            ? { createdAt: { gte: startDate, lte: endDate } }
            : {}),
        },
      });
      const amount = txs.reduce((sum, tx) => sum + Number(tx.amount), 0);
      expenses[acc.name] = amount;
      totalExpenses += amount;
    }

    return {
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
    };
  }

  async getDailySaleSummary(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        transactions: {
          include: {
            debitAccount: true,
            creditAccount: true,
          },
        },
      },
    });

    if (!shift) throw new Error('Shift not found');

    const cashSales = shift.transactions
      .filter((t) => t.debitAccount.code === '10101')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const creditSales = shift.transactions
      .filter((t) => t.debitAccount.code === '10301')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      shiftId: shift.id,
      startTime: shift.startTime,
      endTime: shift.endTime,
      cashSales,
      creditSales,
      totalSales: cashSales + creditSales,
    };
  }

  async getDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today Sales
    const sales = await this.prisma.transaction.findMany({
      where: {
        creditAccount: { name: 'Fuel Sales' },
        createdAt: { gte: today },
      },
    });
    const totalSales = sales.reduce((sum, s) => sum + Number(s.amount), 0);

    // Active Shift
    const activeShift = await this.prisma.shift.findFirst({
      where: { status: 'OPEN' },
      orderBy: { startTime: 'desc' },
    });

    // Today's Credit Sales
    const creditSales = await this.prisma.transaction.findMany({
      where: {
        debitAccount: { name: 'Accounts Receivable' },
        createdAt: { gte: today },
      },
    });
    const totalCredit = creditSales.reduce(
      (sum, s) => sum + Number(s.amount),
      0,
    );

    // Low Stock Alerts
    const tanks = await this.prisma.tank.findMany();
    const lowStockCount = tanks.filter(
      (t) => (Number(t.currentStock) / Number(t.capacity)) * 100 < 20,
    ).length;

    // Sales Trend (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const trendSales = await this.prisma.transaction.findMany({
      where: {
        creditAccount: { name: 'Fuel Sales' },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'asc' },
    });

    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const daySales = trendSales
        .filter((s) => {
          const sd = new Date(s.createdAt);
          sd.setHours(0, 0, 0, 0);
          return sd.getTime() === d.getTime();
        })
        .reduce((sum, s) => sum + Number(s.amount), 0);
      return { date: d.toISOString().split('T')[0], amount: daySales };
    });

    return {
      todaySales: totalSales,
      activeShift: activeShift
        ? { id: activeShift.id, startedAt: activeShift.startTime }
        : null,
      creditSales: totalCredit,
      lowStockCount,
      trend,
      inventory: tanks.map((t) => ({
        name: t.name,
        level: (Number(t.currentStock) / Number(t.capacity)) * 100,
      })),
    };
  }
}
