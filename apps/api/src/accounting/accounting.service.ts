import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class AccountingService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedAccounts();
  }

  async seedAccounts() {
    const defaultAccounts = [
      { code: '10101', name: 'Cash in Hand', type: AccountType.ASSET },
      { code: '10201', name: 'Bank Account', type: AccountType.ASSET },
      { code: '10301', name: 'Accounts Receivable', type: AccountType.ASSET },
      { code: '10401', name: 'Fuel Inventory', type: AccountType.ASSET },
      { code: '20101', name: 'Accounts Payable', type: AccountType.LIABILITY },
      { code: '30101', name: 'Owner Equity', type: AccountType.EQUITY },
      { code: '40101', name: 'Fuel Sales', type: AccountType.INCOME },
      { code: '40201', name: 'Stock Gain', type: AccountType.INCOME },
      { code: '50101', name: 'General Expenses', type: AccountType.EXPENSE },
      { code: '50201', name: 'Cost of Goods Sold', type: AccountType.EXPENSE },
      { code: '50301', name: 'Stock Loss', type: AccountType.EXPENSE },
    ];

    for (const acc of defaultAccounts) {
      const exists = await this.prisma.account.findUnique({
        where: { code: acc.code },
      });
      if (!exists) {
        await this.prisma.account.create({ data: acc });
        console.log(`Seeded account: ${acc.name} (${acc.code})`);
      }
    }
  }

  async createTransaction(data: {
    debitCode: string;
    creditCode: string;
    amount: number;
    profit?: number;
    description?: string;
    shiftId?: string;
  }) {
    const debitAcc = await this.prisma.account.findUnique({
      where: { code: data.debitCode },
    });
    const creditAcc = await this.prisma.account.findUnique({
      where: { code: data.creditCode },
    });

    if (!debitAcc || !creditAcc) {
      throw new Error('Invalid account codes');
    }

    // Create transaction record
    const tx = await this.prisma.transaction.create({
      data: {
        debitAccountId: debitAcc.id,
        creditAccountId: creditAcc.id,
        amount: data.amount,
        profit: data.profit,
        description: data.description,
        shiftId: data.shiftId,
      },
    });

    await this.updateAccountBalance(debitAcc.id);
    await this.updateAccountBalance(creditAcc.id);

    return tx;
  }

  private async updateAccountBalance(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        debitTx: true,
        creditTx: true,
      },
    });

    if (!account) return;

    // Calculate sum of debits and credits
    const totalDebits = account.debitTx.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );
    const totalCredits = account.creditTx.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );

    let balance = 0;
    // For Assets and Expenses: Balance = Debit - Credit
    if (
      ([AccountType.ASSET, AccountType.EXPENSE] as AccountType[]).includes(
        account.type,
      )
    ) {
      balance = totalDebits - totalCredits;
    }
    // For Liabilities, Equity, Income: Balance = Credit - Debit
    else {
      balance = totalCredits - totalDebits;
    }

    await this.prisma.account.update({
      where: { id: accountId },
      data: { balance },
    });
  }

  async getBalanceSheet() {
    return this.prisma.account.findMany();
  }
}
