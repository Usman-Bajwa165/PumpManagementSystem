import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ReportsModule } from '../reports/reports.module';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [PrismaModule, WhatsappModule, ReportsModule, BackupModule],
  providers: [ShiftsService],
  controllers: [ShiftsController],
  exports: [ShiftsService],
})
export class ShiftsModule {}
