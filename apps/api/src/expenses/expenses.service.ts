import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(createExpenseDto: CreateExpenseDto) {
    const { title, amount, category, description, paymentMethod = 'CASH', paymentAccountId, date } = createExpenseDto;

    // Determine credit account based on payment method
    let creditAccountCode = '10101'; // Default to Cash
    if (paymentMethod === 'CARD' || paymentMethod === 'ONLINE') {
      creditAccountCode = '10201'; // Bank Account
    }

    let creditAccount = await this.prisma.account.findUnique({
      where: { code: creditAccountCode },
    });

    if (!creditAccount) {
      throw new NotFoundException(`Account (${creditAccountCode}) not found`);
    }

    // 2. Find or Create Expense Account (Debit) based on Category
    let expenseAccount = await this.prisma.account.findFirst({
      where: {
        name: category,
        type: AccountType.EXPENSE,
      },
    });

    if (!expenseAccount) {
      // Create new expense account
      // Generate code? Simple increment for now or random large number
      const count = await this.prisma.account.count();
      expenseAccount = await this.prisma.account.create({
        data: {
          name: category,
          type: AccountType.EXPENSE,
          code: `500${count + 1}`, // 5xxxx for expenses
        },
      });
    }

    // 3. Create Transaction and ExpenseRecord
    return this.prisma.$transaction(async (tx) => {
      // Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          amount,
          description: `Expense: ${title} (${paymentMethod})`,
          debitAccountId: expenseAccount.id,
          creditAccountId: creditAccount.id,
          paymentAccountId: paymentMethod !== 'CASH' ? paymentAccountId : undefined,
        },
      });

      // Update Account Balances
      await tx.account.update({
        where: { id: expenseAccount.id },
        data: { balance: { increment: amount } },
      });

      await tx.account.update({
        where: { id: creditAccount.id },
        data: { balance: { decrement: amount } }, // Asset decreases on credit
      });

      // Create Expense Record
      return tx.expenseRecord.create({
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
    
    return this.prisma.expenseRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { 
        transaction: { 
          include: { 
            creditAccount: true,
            paymentAccount: true 
          } 
        } 
      },
    });
  }

  findOne(id: string) {
    return this.prisma.expenseRecord.findUnique({
      where: { id },
      include: { transaction: true },
    });
  }

  update(id: string, updateExpenseDto: UpdateExpenseDto) {
    return this.prisma.expenseRecord.update({
      where: { id },
      data: updateExpenseDto,
    });
  }

  async remove(id: string) {
    const expense = await this.prisma.expenseRecord.findUnique({
      where: { id },
      include: { transaction: { include: { debitAccount: true, creditAccount: true } } },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Reverse account balances
      if (expense.transaction) {
        await tx.account.update({
          where: { id: expense.transaction.debitAccountId },
          data: { balance: { decrement: Number(expense.amount) } },
        });

        await tx.account.update({
          where: { id: expense.transaction.creditAccountId },
          data: { balance: { increment: Number(expense.amount) } },
        });

        // Delete transaction
        await tx.transaction.delete({
          where: { id: expense.transactionId! },
        });
      }

      // Delete expense record
      return tx.expenseRecord.delete({
        where: { id },
      });
    });
  }
}
