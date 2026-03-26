import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class PaymentAccountsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AccountingService))
    private accountingService: AccountingService,
  ) {}

  async create(
    data: {
      name: string;
      type: string;
      accountNumber?: string;
      balance?: number;
    },
    userId?: string,
  ) {
    const created = await this.prisma.paymentAccount.create({
      data: { ...data, balance: 0 }, // Always start with 0 in the record, adjustment will set it
    });

    // If opening balance provided, create adjustment transaction via accounting service
    if (data.balance && Number(data.balance) > 0) {
      await this.accountingService.createTransaction({
        debitCode: '10201', // Bank Account
        creditCode: '30101', // Owner Equity
        amount: Number(data.balance),
        description: `Opening balance for ${created.name}`,
        paymentAccountId: created.id,
        createdById: userId,
      });
    }

    return created;
  }

  async findAll() {
    return this.prisma.paymentAccount.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async delete(id: string) {
    const deleted = await this.prisma.paymentAccount.delete({ where: { id } });
    return deleted;
  }

  async update(
    id: string,
    data: {
      name?: string;
      type?: string;
      accountNumber?: string;
      balance?: number;
    },
    userId?: string,
  ) {
    const paymentAccount = await this.prisma.paymentAccount.findUnique({
      where: { id },
    });

    const updated = await this.prisma.paymentAccount.update({
      where: { id },
      data: { ...data, balance: undefined }, // Don't let direct update of balance field
    });

    // If balance was provided, create adjustment transaction via AccountingService
    if (data.balance !== undefined && paymentAccount) {
      const oldBalance = Number(paymentAccount.balance || 0);
      const newBalance = Number(data.balance);
      const difference = newBalance - oldBalance;

      if (difference !== 0) {
        if (difference > 0) {
          // Increase: Debit Bank, Credit Equity
          await this.accountingService.createTransaction({
            debitCode: '10201',
            creditCode: '30101',
            amount: Math.abs(difference),
            description: `Balance adjustment for ${updated.name} - Increase`,
            paymentAccountId: id,
            createdById: userId,
          });
        } else {
          // Decrease: Debit Equity, Credit Bank
          await this.accountingService.createTransaction({
            debitCode: '30101',
            creditCode: '10201',
            amount: Math.abs(difference),
            description: `Balance adjustment for ${updated.name} - Decrease`,
            paymentAccountId: id,
            createdById: userId,
          });
        }
      }
    }

    return updated;
  }

  async getLogs(
    accountId?: string,
    type?: string,
    subType?: string,
    startDate?: string,
    endDate?: string,
  ) {
    let where: Prisma.TransactionWhereInput = {};
    if (accountId) {
      where.paymentAccountId = accountId;
    } else {
      // Show explicit payment account transactions OR general sync adjustments
      where = {
        OR: [
          { paymentAccountId: { not: null } },
          {
            description: { contains: 'Bank Account sync', mode: 'insensitive' },
          },
        ],
      };
    }

    if (type === 'ADJUSTMENT') {
      where = {
        ...where,
        OR: [
          { description: { contains: 'balance', mode: 'insensitive' } },
          { description: { contains: 'sync', mode: 'insensitive' } },
        ],
      };
    } else if (type === 'TRANSACTION') {
      where = {
        ...where,
        NOT: [
          { description: { contains: 'balance', mode: 'insensitive' } },
          { description: { contains: 'sync', mode: 'insensitive' } },
        ],
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        paymentAccount: true,
        createdBy: {
          select: { username: true },
        },
        expenseRecord: true,
        incomeRecord: true,
        shift: true,
        debitAccount: true,
        creditAccount: true,
      },
    });

    let salesBalance = 0;
    let expenses = 0;
    let income = 0;

    const filteredLogs: any[] = [];

    for (const t of transactions) {
      const isAdjustment = !!(
        t.description?.toLowerCase().includes('balance') ||
        t.description?.toLowerCase().includes('sync')
      );
      const logType = isAdjustment ? 'Adjustment' : 'Transaction';
      const amount = Number(t.amount);
      const by = t.createdBy?.username || 'System';

      if (!isAdjustment) {
        if (t.expenseRecord) {
          expenses += amount;
        } else if (t.incomeRecord) {
          income += amount;
        } else if (t.description?.toLowerCase().includes('sale') || t.shiftId) {
          salesBalance += amount;
        } else if (
          t.description?.toLowerCase().includes('supplier') ||
          t.description?.toLowerCase().includes('purchase')
        ) {
          expenses += amount;
        } else {
          income += amount;
        }
      }

      // Check if money came in or out.
      // E.g., expense means money OUT (credit bank), sale means money IN (debit bank)
      // Since `amount` is absolute in transactions, we just return it.
      // But for a better unified view, maybe return signed amount?
      // Since PaymentAccount is usually Debited for IN, and Credited for OUT:
      // If debitAccountId is a bank (10201) => IN.
      // Wait, debit Bank means Bank increases (Asset).
      let isIncoming = false;

      if (isAdjustment) {
        if (t.description?.toLowerCase().includes('decrease')) {
          isIncoming = false;
        } else if (
          t.description?.toLowerCase().includes('increase') ||
          t.description?.toLowerCase().includes('opening')
        ) {
          isIncoming = true;
        } else if (t.description?.toLowerCase().includes('sync')) {
          // If Debit is 10201 (Bank), it means Bank Increased (Money IN from outside? No, wait)
          // If debit is 10201, bank balance increases. If credit is 10201, bank balance decreases.
          isIncoming = t.debitAccount?.code === '10201';
        }
      } else {
        isIncoming =
          t.incomeRecord ||
          t.description?.toLowerCase().includes('sale') ||
          t.shiftId
            ? true
            : false;
      }

      // Apply subType filter (Income/Expense) based on isIncoming property
      if (subType === 'INCOME' && !isIncoming) continue;
      if (subType === 'EXPENSE' && isIncoming) continue;

      filteredLogs.push({
        id: t.id,
        date: t.createdAt,
        type: logType,
        description: t.description || 'Transaction',
        amount: amount,
        isIncoming,
        accountName: t.paymentAccount?.name,
        accountNumber: t.paymentAccount?.accountNumber,
        by,
      });
    }

    // We can also fetch actual current balance of account(s)
    let currentBalance = 0;
    if (accountId) {
      const acc = await this.prisma.paymentAccount.findUnique({
        where: { id: accountId },
      });
      currentBalance = Number(acc?.balance || 0);
    } else {
      const accs = await this.prisma.paymentAccount.findMany();
      currentBalance = accs.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    }

    return {
      logs: filteredLogs,
      summary: {
        currentBalance,
        salesBalance,
        expenses,
        income,
        totalTransactions: salesBalance + income - expenses,
      },
    };
  }
}
