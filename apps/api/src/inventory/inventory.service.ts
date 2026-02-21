import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateTankDto } from './dto/create-tank.dto';
import { CreateNozzleDto } from './dto/create-nozzle.dto';
import { PurchaseProductDto } from './dto/purchase-product.dto';
import { CreateTankDipDto } from './dto/create-tank-dip.dto';
import { AccountingService } from '../accounting/accounting.service';

import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
    private whatsappService: WhatsappService,
  ) {}

  // Products
  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async getProducts() {
    return this.prisma.product.findMany({
      include: { tanks: true },
      orderBy: { name: 'asc' },
    });
  }

  // Tanks
  async createTank(dto: CreateTankDto) {
    return this.prisma.tank.create({ data: dto });
  }

  async getTanks() {
    return this.prisma.tank.findMany({
      include: { product: true, nozzles: true },
      orderBy: { name: 'asc' },
    });
  }

  // Nozzles
  async createNozzle(dto: CreateNozzleDto) {
    return this.prisma.nozzle.create({ data: dto });
  }

  async getNozzles() {
    return this.prisma.nozzle.findMany({
      include: {
        tank: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Purchase / Stock In
  async purchaseProduct(userId: string, dto: PurchaseProductDto) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: dto.tankId },
      include: { product: true },
    });
    if (!tank) throw new BadRequestException('Tank not found');

    // Verify supplier exists if ID is provided, or throw if required
    if (!dto.supplierId) {
      throw new BadRequestException('Supplier is required');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier) throw new BadRequestException('Supplier not found');

    const oldStock = Number(tank.currentStock);
    const newStock = oldStock + dto.quantity;
    const rate = dto.cost / dto.quantity;

    // Use a transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      // 1. Update Tank Stock
      await tx.tank.update({
        where: { id: dto.tankId },
        data: { currentStock: { increment: dto.quantity } },
      });

      // 2. Create Purchase Record
      await tx.purchase.create({
        data: {
          tankId: dto.tankId,
          supplierId: dto.supplierId!, // Assert non-null since we checked
          quantity: dto.quantity,
          totalCost: dto.cost,
          rate: rate,
          status: (dto.paymentStatus as any) || 'UNPAID',
        },
      });

      // 3. Accounting
      // Debit Inventory (Asset)
      // Code 10401

      let remainingToPay = dto.cost;
      if (
        dto.paymentStatus === 'PAID' ||
        (dto.paymentStatus === 'PARTIAL' && (dto.paidAmount ?? 0) > 0)
      ) {
        const paid =
          dto.paymentStatus === 'PAID' ? dto.cost : dto.paidAmount || 0;

        const method = dto.paymentMethod || 'CASH';
        const creditCode = method === 'CASH' ? '10101' : '10201';

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = now
          .toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
          .replace(/\s/g, '');
        const formattedDateTime = `On: ${dateStr}, ${timeStr}`;

        // Credit Cash (Asset) -> Decreases
        await this.accountingService.createTransaction(
          {
            debitCode: '10401', // Inventory
            creditCode, // Cash or Bank
            amount: paid,
            description: `Purchase Payment - ${supplier?.name || tank.name} - ${method} - ${formattedDateTime}`,
            shiftId: null, // Admin action
            supplierId: dto.supplierId,
            paymentAccountId: dto.paymentAccountId,
          },
          tx,
        ); // Pass tx

        remainingToPay -= paid;
      }

      if (remainingToPay > 0 && dto.supplierId) {
        // Update Supplier Balance
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: { balance: { increment: remainingToPay } },
        });

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = now
          .toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
          .replace(/\s/g, '');
        const formattedDateTime = `On: ${dateStr}, ${timeStr}`;

        // Create Accounting Entry
        await this.accountingService.createTransaction(
          {
            debitCode: '10401', // Inventory
            creditCode: '20101', // Accounts Payable
            amount: remainingToPay,
            description: `Credit Purchase - ${supplier?.name} - ${formattedDateTime}`,
            supplierId: dto.supplierId,
          },
          tx,
        );
      }
      await this.accountingService.syncInventoryAccountBalance();
    });

    // Notifications (keep existing logic outside transaction for speed or inside for consistency, outside is fine)
    this.notifyPurchase(userId, dto, tank, newStock).catch(console.error);

    return {
      message: 'Purchase recorded successfully',
      newStock,
    };
  }

  // Helper for notifications to avoid clutter
  private async notifyPurchase(
    userId: string,
    dto: PurchaseProductDto,
    tank: any,
    newStock: number,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const prefs = await this.prisma.notificationPreferences.findFirst();
    if (prefs?.stockNotifications) {
      this.whatsappService
        .notifyStockChange(prefs.phoneNumber, {
          action: 'Purchased',
          user: user?.username || 'Unknown',
          quantity: dto.quantity,
          amount: dto.cost,
          available: newStock,
          tank: tank.name,
          method: dto.paymentStatus,
        } as any)
        .catch(() => {});
    }
  }

  // Tank Dip / Stock Check
  async recordDip(userId: string, dto: CreateTankDipDto) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: dto.tankId },
      include: { product: true },
    });
    if (!tank) throw new BadRequestException('Tank not found');

    const systemStock = Number(tank.currentStock);
    const capacity = Number(tank.capacity);
    const physicalStock = dto.dipReading;

    if (physicalStock > capacity) {
      throw new BadRequestException(
        `Dip reading (${physicalStock}L) cannot exceed tank capacity (${capacity}L)`,
      );
    }

    const variance = physicalStock - systemStock;

    // Record Dip
    await this.prisma.tankDip.create({
      data: {
        tankId: dto.tankId,
        volume: physicalStock,
      },
    });

    if (variance === 0) {
      return { message: 'Dip recorded. No variance.', variance };
    }

    // Adjust System Stock
    await this.prisma.tank.update({
      where: { id: dto.tankId },
      data: { currentStock: physicalStock },
    });

    // Accounting for Variance
    const price = Number(tank.product?.purchasePrice || 0);

    // If manual loss is provided, we use it for the loss transaction.
    // Otherwise, we use the absolute variance if it's a shortage.
    const manualLoss =
      dto.loss !== undefined && dto.loss !== null ? dto.loss : null;
    const lossAmountLiters =
      manualLoss !== null ? manualLoss : variance < 0 ? Math.abs(variance) : 0;
    const varianceAmount = lossAmountLiters * price;

    if (lossAmountLiters > 0) {
      // Record Stock Loss (Shortage)
      await this.accountingService.createTransaction({
        debitCode: '50301', // Stock Loss
        creditCode: '10401', // Fuel Inventory
        amount: varianceAmount,
        description: `Stock Loss adjustment: ${lossAmountLiters}L${manualLoss !== null ? ' (Manual)' : ''}`,
      });
    }

    // Handle Excess separately if variance is positive and NOT covered by manual loss
    // (Usually, if there's an excess, loss would be 0, but we keep the gain logic just in case)
    if (variance > 0 && manualLoss === null) {
      const excessAmount = variance * price;
      await this.accountingService.createTransaction({
        debitCode: '10401', // Fuel Inventory
        creditCode: '40201', // Stock Gain
        amount: excessAmount,
        description: `Stock Excess adjustment: ${variance}L`,
      });
    }

    // Get user info
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const prefs = await this.prisma.notificationPreferences.findFirst();

    // Notify of stock change
    if (prefs?.stockNotifications) {
      this.whatsappService
        .notifyStockChange(prefs.phoneNumber, {
          action: 'Adjusted',
          user: user?.username || 'Unknown',
          quantity: Math.abs(variance),
          amount: varianceAmount,
          available: physicalStock,
          tank: tank.name,
        })
        .catch(() => {});
    }

    // Check for low fuel after adjustment
    const percentage = (physicalStock / Number(tank.capacity)) * 100;
    if (prefs?.inventoryNotifications && percentage < prefs.lowFuelThreshold) {
      this.whatsappService
        .notifyLowFuel(
          prefs.phoneNumber,
          tank.name,
          tank.product.name,
          physicalStock,
          Number(tank.capacity),
          percentage,
        )
        .catch(() => {});
    }

    await this.accountingService.syncInventoryAccountBalance();

    return {
      message: 'Dip recorded and stock adjusted.',
      variance,
      physicalStock,
    };
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  async updateProduct(
    id: string,
    data: { sellingPrice?: number; purchasePrice?: number },
  ) {
    const product = await this.prisma.product.update({
      where: { id },
      data,
    });

    if (data.purchasePrice !== undefined) {
      await this.accountingService.syncInventoryAccountBalance();
    }

    return product;
  }

  async deleteTank(id: string) {
    return this.prisma.tank.delete({ where: { id } });
  }

  async deleteNozzle(id: string) {
    return this.prisma.nozzle.delete({ where: { id } });
  }
}
