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
            product: true 
          } 
        } 
      },
      orderBy: { name: 'asc' },
    });
  }

  // Purchase / Stock In
  async purchaseProduct(userId: string, dto: PurchaseProductDto) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: dto.tankId },
    });
    if (!tank) throw new BadRequestException('Tank not found');

    const oldStock = Number(tank.currentStock);

    // Update Stock
    await this.prisma.tank.update({
      where: { id: dto.tankId },
      data: { currentStock: { increment: dto.quantity } },
    });

    const newStock = oldStock + dto.quantity;

    // Accounting Entry:
    // Debit: Fuel Inventory (Asset)
    // Credit: Accounts Payable (Liability) or Cash (Asset)

    await this.accountingService.createTransaction({
      debitCode: '10401', // Fuel Inventory
      creditCode: '20101', // Accounts Payable
      amount: dto.cost,
      description: `Purchase ${dto.quantity}L for ${tank.name} from ${dto.supplier}`,
    });

    // Get user info
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
        })
        .catch(() => {});
    }

    return {
      message: 'Purchase recorded successfully',
      newStock,
    };
  }

  // Tank Dip / Stock Check
  async recordDip(userId: string, dto: CreateTankDipDto) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: dto.tankId },
      include: { product: true },
    });
    if (!tank) throw new BadRequestException('Tank not found');

    const systemStock = Number(tank.currentStock);
    const physicalStock = dto.dipReading;
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
    const varianceAmount = Math.abs(variance) * price;

    if (variance < 0) {
      // Shortage (Loss)
      await this.accountingService.createTransaction({
        debitCode: '50301', // Stock Loss
        creditCode: '10401', // Fuel Inventory
        amount: varianceAmount,
        description: `Stock Shortage adjustment: ${variance}L`,
      });
    } else {
      // Excess (Gain)
      await this.accountingService.createTransaction({
        debitCode: '10401', // Fuel Inventory
        creditCode: '40201', // Stock Gain
        amount: varianceAmount,
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
      this.whatsappService.notifyLowFuel(
        prefs.phoneNumber,
        tank.name,
        tank.product.name,
        physicalStock,
        Number(tank.capacity),
        percentage,
      ).catch(() => {});
    }

    return {
      message: 'Dip recorded and stock adjusted.',
      variance,
      physicalStock,
    };
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  async updateProduct(id: string, data: { sellingPrice?: number; purchasePrice?: number }) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async deleteTank(id: string) {
    return this.prisma.tank.delete({ where: { id } });
  }

  async deleteNozzle(id: string) {
    return this.prisma.nozzle.delete({ where: { id } });
  }
}
