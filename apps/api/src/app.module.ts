import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { ShiftsModule } from './shifts/shifts.module';
import { AccountingModule } from './accounting/accounting.module';
import { SalesModule } from './sales/sales.module';
import { ReportsModule } from './reports/reports.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { BackupModule } from './backup/backup.module';
import { UsersModule } from './users/users.module';
import { LoggerModule } from './logger/logger.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SeedModule } from './seed/seed.module';
import { PaymentAccountsModule } from './payment-accounts/payment-accounts.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CreditCustomersModule } from './credit-customers/credit-customers.module';
import { IncomeModule } from './income/income.module';

@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    AuthModule,
    InventoryModule,
    ShiftsModule,
    AccountingModule,
    SalesModule,
    ReportsModule,
    WhatsappModule,
    BackupModule,
    UsersModule,
    SeedModule,
    PaymentAccountsModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    SuppliersModule,
    ExpensesModule,
    IncomeModule,
    CreditCustomersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
