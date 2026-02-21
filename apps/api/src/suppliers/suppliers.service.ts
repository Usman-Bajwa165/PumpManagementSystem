import { Injectable } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService,
  ) {}

  create(createSupplierDto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        name: createSupplierDto.name,
        contact: createSupplierDto.contact,
        balance: createSupplierDto.balance,
      },
    });
  }

  findAll() {
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  update(id: string, updateSupplierDto: UpdateSupplierDto) {
    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async paySupplier(
    id: string,
    amount: number,
    userId: string,
    paymentAccountId?: string,
    paymentMethod?: string,
  ) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    if (amount > Number(supplier.balance)) {
      throw new Error(
        `Amount exceeds outstanding balance (Rs. ${Number(supplier.balance).toLocaleString()})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve Payment Account
      let creditAccId = paymentAccountId;
      if (!creditAccId) {
        const method = paymentMethod || 'CASH';
        const code = method === 'CASH' ? '10101' : '10201';
        const acc = await tx.account.findUnique({
          where: { code },
        });
        if (!acc) throw new Error(`Default account (${code}) not found`);
        creditAccId = acc.id;
      }

      // 2. Create Transaction
      // Debit: Accounts Payable (20101) - Reducing Liability
      // Credit: Cash/Bank Account - Reducing Asset
      const debitAcc = await tx.account.findFirst({
        where: { code: '20101' },
      });
      if (!debitAcc) throw new Error('Accounts Payable (20101) not found');

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

      const trans = await tx.transaction.create({
        data: {
          supplierId: id,
          debitAccountId: debitAcc.id,
          creditAccountId: creditAccId,
          amount: amount,
          createdById: userId,
          description: `Supplier Payment - ${supplier.name} - ${paymentMethod || 'CASH'} - ${formattedDateTime}`,
          paymentAccountId: paymentAccountId,
        },
      });

      // 3. Update Supplier Balance
      const updatedSupplier = await tx.supplier.update({
        where: { id },
        data: { balance: { decrement: amount } },
      });

      // 4. Update Account Balances
      await tx.account.update({
        where: { id: debitAcc.id },
        data: { balance: { decrement: amount } },
      });

      await tx.account.update({
        where: { id: creditAccId },
        data: { balance: { decrement: amount } },
      });

      // 5. Allocate payment to purchases (FIFO)
      let remainingToApply = amount;
      const outstandingPurchases = await tx.purchase.findMany({
        where: {
          supplierId: id,
          status: { in: ['UNPAID', 'PARTIAL'] },
        },
        orderBy: { date: 'asc' },
      });

      for (const purchase of outstandingPurchases) {
        if (remainingToApply <= 0) break;

        const totalCost = Number(purchase.totalCost);
        const currentPaid = Number(purchase.paidAmount || 0);
        const needed = totalCost - currentPaid;

        if (needed <= 0) continue;

        const applyNow = Math.min(remainingToApply, needed);
        const newPaid = currentPaid + applyNow;
        const newStatus = newPaid >= totalCost ? 'PAID' : 'PARTIAL';

        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            paidAmount: newPaid,
            status: newStatus,
          },
        });

        remainingToApply -= applyNow;
      }

      // 6. WhatsApp Notification
      try {
        const prefs = await this.prisma.notificationPreferences.findFirst();
        if (prefs && prefs.inventoryNotifications) {
          await this.whatsappService.notifySupplierPayment(prefs.phoneNumber, {
            supplier: supplier.name,
            amount: amount,
            method: paymentMethod || 'CASH',
            remainingAmount: Number(updatedSupplier.balance),
          });
        }
      } catch (err: any) {
        console.error('Failed to send supplier payment notification', err);
      }

      return trans;
    });
  }

  remove(id: string) {
    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
