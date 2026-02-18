import { Injectable } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

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
  ) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

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
        const cashAcc = await tx.account.findUnique({
          where: { code: '10101' },
        });
        if (!cashAcc) throw new Error('Default Cash account (10101) not found');
        creditAccId = cashAcc.id;
      }

      // 1. Create Transaction
      // Debit: Accounts Payable (20101) - Reducing Liability
      // Credit: Cash/Bank Account - Reducing Asset
      const debitAcc = await tx.account.findFirst({
        where: { code: '20101' },
      });
      if (!debitAcc) throw new Error('Accounts Payable (20101) not found');

      const trans = await tx.transaction.create({
        data: {
          supplierId: id,
          debitAccountId: debitAcc.id,
          creditAccountId: creditAccId,
          amount: amount,
          createdById: userId,
          description: `Payment to ${supplier.name}`,
        },
      });

      // 2. Update Supplier Balance
      await tx.supplier.update({
        where: { id },
        data: { balance: { decrement: amount } },
      });

      // 3. Update Account Balances
      await tx.account.update({
        where: { id: debitAcc.id },
        data: { balance: { decrement: amount } },
      });

      await tx.account.update({
        where: { id: creditAccId },
        data: { balance: { decrement: amount } },
      });

      // 4. Allocate payment to purchases (FIFO)
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

      return trans;
    });
  }

  remove(id: string) {
    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
