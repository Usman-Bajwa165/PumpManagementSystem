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

      // Get nozzle with tank and product info
      const nozzle = await this.prisma.nozzle.findUnique({
        where: { id: dto.nozzleId },
        include: { tank: { include: { product: true } } },
      });

      if (!nozzle) {
        throw new BadRequestException('Nozzle not found');
      }

      // Check tank has enough stock
      if (Number(nozzle.tank.currentStock) < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock in ${nozzle.tank.name}. Available: ${nozzle.tank.currentStock}L`,
        );
      }

      // Deduct from tank
      await this.prisma.tank.update({
        where: { id: nozzle.tankId },
        data: { currentStock: { decrement: dto.quantity } },
      });

      // Check for low fuel after deduction
      const updatedTank = await this.prisma.tank.findUnique({
        where: { id: nozzle.tankId },
        include: { product: true },
      });

      if (updatedTank) {
        const percentage =
          (Number(updatedTank.currentStock) / Number(updatedTank.capacity)) *
          100;
        const prefs = await this.prisma.notificationPreferences.findFirst();

        if (
          prefs &&
          prefs.inventoryNotifications &&
          percentage < prefs.lowFuelThreshold
        ) {
          this.whatsappService
            .notifyLowFuel(
              prefs.phoneNumber,
              updatedTank.name,
              updatedTank.product.name,
              Number(updatedTank.currentStock),
              Number(updatedTank.capacity),
              percentage,
            )
            .catch(() => {});
        }
      }

      // Update nozzle reading
      await this.prisma.nozzle.update({
        where: { id: dto.nozzleId },
        data: { lastReading: { increment: dto.quantity } },
      });

      const incomeAccountCode = '40101'; // Fuel Sales
      let debitAccountCode = '';

      if (dto.paymentMethod === 'CASH') {
        debitAccountCode = '10101';
      } else if (
        dto.paymentMethod === 'CARD' ||
        dto.paymentMethod === 'ONLINE'
      ) {
        debitAccountCode = '10201'; // Bank Account
      } else if (dto.paymentMethod === 'CREDIT') {
        debitAccountCode = '10301';

        // Update or create credit customer
        if (dto.customerName) {
          let customer = await this.prisma.creditCustomer.findUnique({
            where: { name: dto.customerName },
          });

          if (!customer) {
            customer = await this.prisma.creditCustomer.create({
              data: {
                name: dto.customerName,
                vehicleNumber: dto.vehicleNumber,
                totalCredit: dto.amount,
              },
            });
          } else {
            await this.prisma.creditCustomer.update({
              where: { name: dto.customerName },
              data: {
                totalCredit: { increment: dto.amount },
                vehicleNumber: dto.vehicleNumber || customer.vehicleNumber,
              },
            });
          }

          // Create credit record with today's date
          await this.prisma.creditRecord.create({
            data: {
              customerId: customer.id,
              amount: dto.amount,
              remainingAmount: dto.amount,
            },
          });
        }
      } else {
        throw new BadRequestException('Invalid payment method');
      }

      // Check if customer exists based on name for credit or just for tracking
      let customerId: string | undefined;
      if (dto.customerName) {
        const customer = await this.prisma.creditCustomer.findUnique({
          where: { name: dto.customerName },
        });
        customerId = customer?.id;
      }

      // Calculate profit: (sellingPrice - purchasePrice) * quantity
      const profit =
        (Number(nozzle.tank.product.sellingPrice) -
          Number(nozzle.tank.product.purchasePrice)) *
        dto.quantity;

      const tx = await this.accountingService.createTransaction({
        debitCode: debitAccountCode,
        creditCode: incomeAccountCode,
        amount: dto.amount,
        profit,
        description:
          dto.description ||
          `${nozzle.name} - ${dto.quantity}L ${nozzle.tank.product.name} - ${dto.paymentMethod}${dto.customerName ? ` - ${dto.customerName}` : ''}${dto.vehicleNumber ? ` (${dto.vehicleNumber})` : ''}${dto.paymentAccountId ? ` [Account: ${dto.paymentAccountId}]` : ''}`,
        shiftId: shift.id,
        customerId,
        createdById: userId,
        paymentAccountId: dto.paymentAccountId,
        nozzleId: dto.nozzleId,
        productId: nozzle.tank.productId,
        quantity: dto.quantity,
      });

      // Record Cost of Goods Sold (COGS) to reduce Inventory ledger instantly
      // Debit: 50201 (Cost of Goods Sold - Expense)
      // Credit: 10401 (Fuel Inventory - Asset)
      const costAmount =
        Number(nozzle.tank.product.purchasePrice) * dto.quantity;
      if (costAmount > 0) {
        await this.accountingService.createTransaction({
          debitCode: '50201',
          creditCode: '10401',
          amount: costAmount,
          description: `COGS: ${dto.quantity}L ${nozzle.tank.product.name}`,
          shiftId: shift.id,
          productId: nozzle.tank.productId,
          quantity: dto.quantity,
        });
      }

      this.logger.logBusinessOperation(
        'SALE_RECORDED',
        `${nozzle.name}: ${dto.quantity}L @ Rs. ${dto.amount} - ${dto.paymentMethod}`,
        userId,
        true,
      );

      // Send WhatsApp notification if enabled
      try {
        const prefs = await this.prisma.notificationPreferences.findFirst();
        if (prefs && prefs.salesNotifications) {
          // Check if this payment method notification is enabled
          const shouldNotify =
            (dto.paymentMethod === 'CASH' &&
              prefs.notifyCash &&
              dto.amount >= Number(prefs.minCashAmount)) ||
            (dto.paymentMethod === 'CARD' &&
              prefs.notifyCard &&
              dto.amount >= Number(prefs.minCardAmount)) ||
            (dto.paymentMethod === 'ONLINE' &&
              prefs.notifyOnline &&
              dto.amount >= Number(prefs.minOnlineAmount)) ||
            (dto.paymentMethod === 'CREDIT' &&
              prefs.notifyCredit &&
              dto.amount >= Number(prefs.minCreditAmount));

          if (shouldNotify) {
            // Get account name if provided
            let accountName: string | undefined;
            if (dto.paymentAccountId) {
              const account = await this.prisma.paymentAccount.findUnique({
                where: { id: dto.paymentAccountId },
              });
              accountName = account?.name;
            }

            await this.whatsappService.notifySale(
              prefs.phoneNumber,
              Number(dto.amount),
              dto.paymentMethod,
              dto.customerName,
              dto.vehicleNumber,
              accountName,
            );
          }
        }
      } catch (err: any) {
        this.logger.error(
          'WhatsApp sale notification failed',
          err.message,
          'SalesService',
        );
      }

      await this.accountingService.syncInventoryAccountBalance();

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

  async getCreditCustomers() {
    return this.prisma.creditCustomer
      .findMany({
        where: { totalCredit: { gt: 0 } },
        orderBy: { name: 'asc' },
        select: {
          name: true,
          vehicleNumber: true,
          totalCredit: true,
        },
      })
      .then((customers) =>
        customers.map((c) => ({
          name: c.name,
          vehicle: c.vehicleNumber,
          amount: Number(c.totalCredit),
        })),
      );
  }

  async clearCredit(
    userId: string,
    dto: { customerName: string; amount: number },
  ) {
    try {
      const shift = await this.shiftsService.getCurrentShift();
      if (!shift) {
        throw new BadRequestException('No open shift');
      }

      // Update customer credit
      const customer = await this.prisma.creditCustomer.findUnique({
        where: { name: dto.customerName },
        include: {
          creditRecords: {
            where: { remainingAmount: { gt: 0 } },
            orderBy: { creditDate: 'asc' },
          },
        },
      });

      if (customer) {
        let remainingPayment = dto.amount;

        // Pay off oldest credits first (FIFO)
        for (const record of customer.creditRecords) {
          if (remainingPayment <= 0) break;

          const recordRemaining = Number(record.remainingAmount);
          const paymentForThisRecord = Math.min(
            remainingPayment,
            recordRemaining,
          );

          await this.prisma.creditRecord.update({
            where: { id: record.id },
            data: { remainingAmount: { decrement: paymentForThisRecord } },
          });

          remainingPayment -= paymentForThisRecord;
        }

        await this.prisma.creditCustomer.update({
          where: { name: dto.customerName },
          data: { totalCredit: { decrement: dto.amount } },
        });
      }

      await this.accountingService.createTransaction({
        debitCode: '10101',
        creditCode: '10301',
        amount: dto.amount,
        description: `Credit payment - ${dto.customerName} - Cleared`,
        shiftId: shift.id,
      });

      this.logger.logBusinessOperation(
        'CREDIT_CLEARED',
        `${dto.customerName}: Rs. ${dto.amount}`,
        userId,
        true,
      );

      // WhatsApp Notification
      try {
        const prefs = await this.prisma.notificationPreferences.findFirst();
        if (prefs && prefs.salesNotifications) {
          await this.whatsappService.notifyCashPayment(prefs.phoneNumber, {
            customer: dto.customerName,
            amount: dto.amount,
            method: 'CASH (Credit Clearance)',
          });
        }
      } catch (err) {
        this.logger.error(
          'Failed to send credit clear notification',
          (err as Error).message,
        );
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Credit clear failed: ${dto.customerName}`,
        error.message,
        'SalesService',
        userId,
      );
      throw error;
    }
  }
}
