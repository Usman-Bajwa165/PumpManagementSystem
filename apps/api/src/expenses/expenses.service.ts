import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(createExpenseDto: CreateExpenseDto) {
    const { title, amount, category, description } = createExpenseDto;

    // 1. Find Cash Account (Credit) - Assuming '10101' is Cash in Hand
    // Better approach: Find by Type if specific code not guaranteed, but for now strict code is safer
    let cashAccount = await this.prisma.account.findUnique({
      where: { code: '10101' },
    });

    if (!cashAccount) {
      // Fallback or Error
      throw new NotFoundException('Cash Account (10101) not found');
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
          description: `Expense: ${title}`,
          debitAccountId: expenseAccount.id,
          creditAccountId: cashAccount.id,
        },
      });

      // Update Account Balances
      await tx.account.update({
        where: { id: expenseAccount.id },
        data: { balance: { increment: amount } },
      });

      await tx.account.update({
        where: { id: cashAccount.id },
        data: { balance: { decrement: amount } }, // Asset decreases on credit
      });

      // Create Expense Record
      return tx.expenseRecord.create({
        data: {
          title,
          amount,
          category,
          description,
          transactionId: transaction.id,
        },
      });
    });
  }

  findAll() {
    return this.prisma.expenseRecord.findMany({
      orderBy: { date: 'desc' },
      include: { transaction: true },
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

  remove(id: string) {
    return this.prisma.expenseRecord.delete({
      where: { id },
    });
  }
}
