import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { ShiftsService } from '../shifts/shifts.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
    private shiftsService: ShiftsService,
    private whatsappService: WhatsappService,
  ) {}

  async createSale(userId: string, dto: CreateSaleDto) {
    const shift = await this.shiftsService.getCurrentShift();
    if (!shift) {
      throw new BadRequestException(
        'No open shift found. Sales can only be recorded during a shift.',
      );
    }

    const incomeAccountCode = '40101'; // Fuel Sales

    let debitAccountCode = '';
    if (dto.paymentMethod === 'CASH') {
      debitAccountCode = '10101'; // Cash in Hand
    } else if (dto.paymentMethod === 'CREDIT') {
      debitAccountCode = '10301'; // Accounts Receivable
    } else {
      throw new BadRequestException('Invalid payment method');
    }

    // Create the transaction via Accounting Service
    const tx = await this.accountingService.createTransaction({
      debitCode: debitAccountCode,
      creditCode: incomeAccountCode,
      amount: dto.amount,
      description: dto.description || `Sale - ${dto.paymentMethod}`,
      shiftId: shift.id,
    });

    // Proactive: Notify Manager of large sales or all sales?
    // For now, let's just trigger it. In production, this would be configurable.
    this.whatsappService
      .notifySale('923000000000', Number(dto.amount), dto.paymentMethod)
      .catch(() => {});

    return tx;
  }
}
