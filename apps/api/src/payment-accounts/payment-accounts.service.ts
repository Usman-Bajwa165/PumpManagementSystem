import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; type: string; accountNumber?: string; balance?: number }) {
    const created = await this.prisma.paymentAccount.create({ data });
    
    // If opening balance provided, create adjustment transaction
    if (data.balance && Number(data.balance) > 0) {
      const bankAccount = await this.prisma.account.findFirst({
        where: { code: '10201' },
      });
      const equityAccount = await this.prisma.account.findFirst({
        where: { code: '30101' },
      });

      if (bankAccount && equityAccount) {
        // Debit Bank, Credit Equity for opening balance
        await this.prisma.transaction.create({
          data: {
            debitAccountId: bankAccount.id,
            creditAccountId: equityAccount.id,
            amount: Number(data.balance),
            description: `Opening balance for ${created.name}`,
          },
        });
      }
    }
    
    await this.syncBankAccountBalance();
    return created;
  }

  async findAll() {
    return this.prisma.paymentAccount.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async delete(id: string) {
    const deleted = await this.prisma.paymentAccount.delete({ where: { id } });
    await this.syncBankAccountBalance();
    return deleted;
  }

  async update(
    id: string,
    data: { name?: string; type?: string; accountNumber?: string; balance?: number },
  ) {
    const paymentAccount = await this.prisma.paymentAccount.findUnique({
      where: { id },
    });

    const updated = await this.prisma.paymentAccount.update({
      where: { id },
      data,
    });

    // If balance was updated, create adjustment transaction and sync
    if (data.balance !== undefined && paymentAccount) {
      const oldBalance = Number(paymentAccount.balance || 0);
      const newBalance = Number(data.balance);
      const difference = newBalance - oldBalance;

      if (difference !== 0) {
        // Get Bank Account (10201) and Owner Equity (30101)
        const bankAccount = await this.prisma.account.findFirst({
          where: { code: '10201' },
        });
        const equityAccount = await this.prisma.account.findFirst({
          where: { code: '30101' },
        });

        if (bankAccount && equityAccount) {
          // Create adjustment transaction
          if (difference > 0) {
            // Increase: Debit Bank, Credit Equity
            await this.prisma.transaction.create({
              data: {
                debitAccountId: bankAccount.id,
                creditAccountId: equityAccount.id,
                amount: Math.abs(difference),
                description: `Balance adjustment for ${updated.name} - Increase`,
              },
            });
          } else {
            // Decrease: Debit Equity, Credit Bank
            await this.prisma.transaction.create({
              data: {
                debitAccountId: equityAccount.id,
                creditAccountId: bankAccount.id,
                amount: Math.abs(difference),
                description: `Balance adjustment for ${updated.name} - Decrease`,
              },
            });
          }
        }

        await this.syncBankAccountBalance();
      }
    }

    return updated;
  }

  private async syncBankAccountBalance() {
    // Get all payment accounts
    const paymentAccounts = await this.prisma.paymentAccount.findMany();
    
    // Calculate total balance
    const totalBalance = paymentAccounts.reduce(
      (sum, pa) => sum + Number(pa.balance || 0),
      0,
    );

    // Update Bank Account (code: 10201)
    await this.prisma.account.updateMany({
      where: { code: '10201' },
      data: { balance: totalBalance },
    });
  }
}
