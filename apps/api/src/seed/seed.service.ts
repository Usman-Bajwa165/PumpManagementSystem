import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, AccountType } from '@prisma/client';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      this.logger.log('Running conditional seed checks...');
      await this.ensureUser('admin@gmail.com', 'admin123', Role.ADMIN);
      await this.ensureUser('manager@gmail.com', 'manager123', Role.MANAGER);
      await this.ensureUser('operator@gmail.com', 'operator123', Role.OPERATOR);

      await this.ensureAccount('10101', 'Cash in Hand', AccountType.ASSET);
      await this.ensureAccount('10201', 'Bank Account', AccountType.ASSET);
      await this.ensureAccount(
        '10301',
        'Accounts Receivable',
        AccountType.ASSET,
      );
      await this.ensureAccount('10401', 'Fuel Inventory', AccountType.ASSET);
      await this.ensureAccount(
        '20101',
        'Accounts Payable',
        AccountType.LIABILITY,
      );
      await this.ensureAccount('30101', 'Owner Equity', AccountType.EQUITY);
      await this.ensureAccount('40101', 'Fuel Sales', AccountType.INCOME);
      await this.ensureAccount('40201', 'Stock Gain', AccountType.INCOME);
      await this.ensureAccount(
        '50101',
        'General Expenses',
        AccountType.EXPENSE,
      );
      await this.ensureAccount(
        '50201',
        'Cost of Goods Sold',
        AccountType.EXPENSE,
      );
      await this.ensureAccount('50301', 'Stock Loss', AccountType.EXPENSE);

      this.logger.log('Conditional seed finished.');
    } catch (err) {
      this.logger.error('Seeding error', err as any);
    }
  }

  private async ensureUser(username: string, password: string, role: Role) {
    // upsert ensures no data is wiped and avoids duplicates
    const hashed = await bcrypt.hash(password, 10);
    await this.prisma.user.upsert({
      where: { username },
      update: {}, // don't modify if exists
      create: { username, password: hashed, role },
    });
    this.logger.log(`Ensured user ${username}`);
  }

  private async ensureAccount(code: string, name: string, type: AccountType) {
    await this.prisma.account.upsert({
      where: { code },
      update: {},
      create: { code, name, type, balance: 0 },
    });
    this.logger.log(`Ensured account ${code} ${name}`);
  }
}
