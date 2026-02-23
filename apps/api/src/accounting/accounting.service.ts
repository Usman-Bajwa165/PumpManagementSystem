import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CustomLogger } from '../logger/custom-logger.service';

@Injectable()
export class AccountingService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private logger: CustomLogger,
  ) {}

  async onModuleInit() {
    await this.seedAccounts();
    // await this.seedPaymentAccounts();
    await this.syncInventoryAccountBalance();
  }

  async seedAccounts() {
    const defaultAccounts = [
      { code: '10101', name: 'Cash in Hand', type: AccountType.ASSET },
      {
        code: '10201',
        name: 'Bank Account (Card/Online)',
        type: AccountType.ASSET,
      },
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
      } else if (acc.code === '10201' && exists.name === 'Bank Account') {
        // Update old name to new name
        await this.prisma.account.update({
          where: { code: acc.code },
          data: { name: acc.name },
        });
        console.log(`Updated account: ${acc.name} (${acc.code})`);
      }
    }
  }

  // async seedPaymentAccounts() {
  //   const paymentAccounts = [
  //     { name: 'JazzCash', type: 'ONLINE', accountNumber: null },
  //     { name: 'EasyPaisa', type: 'ONLINE', accountNumber: null },
  //   ];

  //   for (const pa of paymentAccounts) {
  //     const exists = await this.prisma.paymentAccount.findFirst({
  //       where: { name: pa.name },
  //     });
  //     if (!exists) {
  //       await this.prisma.paymentAccount.create({ data: pa });
  //       console.log(`Seeded payment account: ${pa.name}`);
  //     }
  //   }
  // }

  async createTransaction(
    data: {
      debitCode: string;
      creditCode: string;
      amount: number;
      profit?: number;
      description?: string;
      shiftId?: string | null;
      supplierId?: string;
      customerId?: string;
      createdById?: string;
      paymentAccountId?: string;
      nozzleId?: string;
      productId?: string;
      quantity?: number;
    },
    prismaTx?: any, // Should be Prisma.TransactionClient but 'any' avoids import issues for now
  ) {
    const prisma = prismaTx || this.prisma;

    const debitAcc = await prisma.account.findUnique({
      where: { code: data.debitCode },
    });
    const creditAcc = await prisma.account.findUnique({
      where: { code: data.creditCode },
    });

    if (!debitAcc || !creditAcc) {
      throw new Error(
        `Invalid account codes: ${data.debitCode} or ${data.creditCode}`,
      );
    }

    // Create transaction record
    const tx = await prisma.transaction.create({
      data: {
        debitAccountId: debitAcc.id,
        creditAccountId: creditAcc.id,
        amount: data.amount,
        profit: data.profit,
        description: data.description,
        shiftId: data.shiftId,
        supplierId: data.supplierId,
        customerId: data.customerId,
        createdById: data.createdById,
        paymentAccountId: data.paymentAccountId,
        nozzleId: data.nozzleId,
        productId: data.productId,
        quantity: data.quantity,
      },
    });

    await this.updateAccountBalance(debitAcc.id);
    await this.updateAccountBalance(creditAcc.id);

    return tx;
  }

  async syncInventoryAccountBalance() {
    const fuelInventoryAccount = await this.prisma.account.findUnique({
      where: { code: '10401' },
    });

    if (!fuelInventoryAccount) return;

    const tanks = await this.prisma.tank.findMany({
      include: { product: true },
    });

    const totalInventoryValue = tanks.reduce((sum, tank) => {
      const stock = Number(tank.currentStock);
      const price = Number(tank.product?.purchasePrice || 0);
      return sum + stock * price;
    }, 0);

    const currentLedgerBalance = Number(fuelInventoryAccount.balance);
    const discrepancy = totalInventoryValue - currentLedgerBalance;

    if (Math.abs(discrepancy) < 0.01) return;

    if (discrepancy > 0) {
      await this.createTransaction({
        debitCode: '10401',
        creditCode: '30101',
        amount: discrepancy,
        description: 'Inventory Valuation Adjustment (Equity)',
      });
    } else {
      // If discrepancy is negative (Physical < Ledger), it's likely a loss or shrinkage.
      // Nature: Debit Stock Loss (50301), Credit Inventory (10401)
      await this.createTransaction({
        debitCode: '50301',
        creditCode: '10401',
        amount: Math.abs(discrepancy),
        description: 'Inventory Valuation Adjustment (Shrinkage)',
      });
    }

    this.logger.logBusinessOperation(
      'SYNC_INVENTORY_BALANCE',
      `Adjusted by Rs. ${discrepancy.toLocaleString()}. New Value: Rs. ${totalInventoryValue.toLocaleString()}`,
      'SYSTEM',
    );
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

  // ========== CHART OF ACCOUNTS MANAGEMENT ==========

  async getAllAccounts() {
    return this.prisma.account.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: {
            debitTx: true,
            creditTx: true,
          },
        },
      },
    });
  }

  async getAccountById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: { debitTx: true, creditTx: true },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async createAccount(dto: CreateAccountDto, userId?: string) {
    // Validate code format and range
    const codeNum = parseInt(dto.code);
    const validRanges = {
      ASSET: [10000, 19999],
      LIABILITY: [20000, 29999],
      EQUITY: [30000, 39999],
      INCOME: [40000, 49999],
      EXPENSE: [50000, 59999],
    };

    const [min, max] = validRanges[dto.type];
    if (codeNum < min || codeNum > max) {
      throw new BadRequestException(
        `Account code ${dto.code} is invalid for type ${dto.type}. Must be between ${min}-${max}`,
      );
    }

    // Check if code already exists
    const existing = await this.prisma.account.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Account code ${dto.code} already exists`);
    }

    const account = await this.prisma.account.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type as AccountType,
        balance: dto.balance || 0,
      },
    });

    this.logger.logBusinessOperation(
      'CREATE_ACCOUNT',
      `${dto.code} - ${dto.name} (${dto.type})`,
      userId,
    );

    return account;
  }

  async updateAccount(id: string, dto: UpdateAccountDto, userId?: string) {
    const account = await this.getAccountById(id);

    // If type is being changed, validate code range
    if (dto.type && dto.type !== account.type) {
      const codeNum = parseInt(account.code);
      const validRanges = {
        ASSET: [10000, 19999],
        LIABILITY: [20000, 29999],
        EQUITY: [30000, 39999],
        INCOME: [40000, 49999],
        EXPENSE: [50000, 59999],
      };

      const [min, max] = validRanges[dto.type];
      if (codeNum < min || codeNum > max) {
        throw new BadRequestException(
          `Cannot change type to ${dto.type}. Account code ${account.code} must be between ${min}-${max}`,
        );
      }
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.type) updateData.type = dto.type as AccountType;

    const updated = await this.prisma.account.update({
      where: { id },
      data: updateData,
    });

    // Recalculate balance if type changed
    if (dto.type && dto.type !== account.type) {
      await this.updateAccountBalance(id);
    }

    this.logger.logBusinessOperation(
      'UPDATE_ACCOUNT',
      `${account.code} - ${account.name}`,
      userId,
    );

    return updated;
  }

  async deleteAccount(id: string, userId?: string) {
    const account = await this.getAccountById(id);

    // Check if account has transactions
    const txCount = account._count.debitTx + account._count.creditTx;
    if (txCount > 0) {
      throw new BadRequestException(
        `Cannot delete account ${account.code} - ${account.name}. It has ${txCount} transaction(s). Archive it instead.`,
      );
    }

    // Prevent deletion of critical system accounts
    const protectedCodes = [
      '10101',
      '10201',
      '10301',
      '10401',
      '20101',
      '30101',
      '40101',
      '50101',
      '50201',
    ];
    if (protectedCodes.includes(account.code)) {
      throw new BadRequestException(
        `Cannot delete system account ${account.code} - ${account.name}`,
      );
    }

    await this.prisma.account.delete({ where: { id } });

    this.logger.logBusinessOperation(
      'DELETE_ACCOUNT',
      `${account.code} - ${account.name}`,
      userId,
    );

    return { message: 'Account deleted successfully' };
  }

  async resetAccountBalance(id: string, userId?: string) {
    const account = await this.getAccountById(id);

    // Check if account has transactions
    const txCount = account._count.debitTx + account._count.creditTx;
    if (txCount > 0) {
      throw new BadRequestException(
        `Cannot reset balance for account ${account.code} - ${account.name}. It has ${txCount} transaction(s). Delete transactions first.`,
      );
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: { balance: 0 },
    });

    this.logger.logBusinessOperation(
      'RESET_ACCOUNT_BALANCE',
      `${account.code} - ${account.name}`,
      userId,
    );

    return updated;
  }

  async getPaymentAccounts() {
    return this.prisma.paymentAccount.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
