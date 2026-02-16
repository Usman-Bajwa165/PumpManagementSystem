import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, AccountingModule, ShiftsModule, WhatsappModule],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
