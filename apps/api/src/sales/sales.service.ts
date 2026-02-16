import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { ShiftsService } from '../shifts/shifts.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CustomLogger } from '../logger/custom-logger.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
    private shiftsService: ShiftsService,
    private whatsappService: WhatsappService,
    private logger: CustomLogger,
  ) {}

  async createSale(userId: string, dto: CreateSaleDto) {
    try {
      const shift = await this.shiftsService.getCurrentShift();
      if (!shift) {
        this.logger.warn(
          `Sale creation failed: No open shift`,
          'SalesService',
          userId,
        );
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
        this.logger.warn(
          `Invalid payment method: ${dto.paymentMethod}`,
          'SalesService',
          userId,
        );
        throw new BadRequestException('Invalid payment method');
      }

      const tx = await this.accountingService.createTransaction({
        debitCode: debitAccountCode,
        creditCode: incomeAccountCode,
        amount: dto.amount,
        description: dto.description || `Sale - ${dto.paymentMethod}`,
        shiftId: shift.id,
      });

      this.logger.logBusinessOperation(
        'SALE_RECORDED',
        `Rs. ${dto.amount} - ${dto.paymentMethod} - Shift ${shift.id}`,
        userId,
        true,
      );

      this.whatsappService
        .notifySale('923000000000', Number(dto.amount), dto.paymentMethod)
        .catch((err) => {
          this.logger.error(
            'WhatsApp sale notification failed',
            err.message,
            'SalesService',
          );
        });

      return tx;
    } catch (error: any) {
      this.logger.error(
        `Sale creation failed: Rs. ${dto.amount}`,
        error.message,
        'SalesService',
        userId,
      );
      throw error;
    }
  }
}
