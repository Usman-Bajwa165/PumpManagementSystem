import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class IncomeService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
  ) {}

  async create(createIncomeDto: CreateIncomeDto) {
    const {
      title,
      amount,
      category,
      description,
      paymentMethod = 'CASH',
      paymentAccountId,
      date,
    } = createIncomeDto;

    // Determine debit account based on payment method (where money is going IN)
    let debitAccountCode = '10101'; // Default to Cash
    if (paymentMethod === 'CARD' || paymentMethod === 'ONLINE') {
      debitAccountCode = '10201'; // Bank Account
    }

    let debitAccount = await this.prisma.account.findUnique({
      where: { code: debitAccountCode },
    });

    if (!debitAccount) {
      throw new NotFoundException(`Account (${debitAccountCode}) not found`);
    }

    // Find or Create Income Account (Credit) based on Category
    let incomeAccount = await this.prisma.account.findFirst({
      where: {
        name: category,
        type: AccountType.INCOME,
      },
    });

    if (!incomeAccount) {
      // Create new income account
      const count = await this.prisma.account.count();
      incomeAccount = await this.prisma.account.create({
        data: {
          name: category,
          type: AccountType.INCOME,
          code: `409${count + 1}`, // 4xxxx for income, 409xx for other income
        },
      });
    }

    // Create Transaction and IncomeRecord
    return await this.prisma.$transaction(async (tx) => {
      const transaction = await this.accountingService.createTransaction(
        {
          debitCode: debitAccountCode,
          creditCode: incomeAccount!.code,
          amount,
          description: `Income: ${title} (${paymentMethod})`,
          paymentAccountId:
            paymentMethod !== 'CASH' ? paymentAccountId : undefined,
        },
        tx,
      );

      // Create Income Record
      return await tx.incomeRecord.create({
        data: {
          title,
          amount,
          category,
          description,
          date: date || new Date(),
          transactionId: transaction.id,
        },
      });
    });
  }

  async findAll(startDate?: Date, endDate?: Date, category?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) {
        const adjustedEnd = new Date(endDate);
        adjustedEnd.setHours(23, 59, 59, 999);
        where.date.lte = adjustedEnd;
      }
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    return await this.prisma.incomeRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        transaction: {
          include: {
            creditAccount: true,
            debitAccount: true,
            paymentAccount: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.incomeRecord.findUnique({
      where: { id },
      include: { transaction: true },
    });
  }

  async update(id: string, updateIncomeDto: UpdateIncomeDto) {
    return await this.prisma.incomeRecord.update({
      where: { id },
      data: updateIncomeDto,
    });
  }

  async remove(id: string) {
    const income = await this.prisma.incomeRecord.findUnique({
      where: { id },
      include: {
        transaction: { include: { debitAccount: true, creditAccount: true } },
      },
    });

    if (!income) {
      throw new NotFoundException('Income record not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Reverse account balances
      if (income.transaction) {
        await tx.account.update({
          where: { id: income.transaction.debitAccountId },
          data: { balance: { decrement: Number(income.amount) } },
        });

        await tx.account.update({
          where: { id: income.transaction.creditAccountId },
          data: { balance: { decrement: Number(income.amount) } },
        });

        // Delete transaction
        await tx.transaction.delete({
          where: { id: income.transactionId! },
        });
      }

      // Delete income record
      return tx.incomeRecord.delete({
        where: { id },
      });
    });
  }
}
