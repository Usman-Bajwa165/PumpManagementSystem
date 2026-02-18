import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; type: string; accountNumber?: string }) {
    return this.prisma.paymentAccount.create({ data });
  }

  async findAll() {
    return this.prisma.paymentAccount.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async delete(id: string) {
    return this.prisma.paymentAccount.delete({ where: { id } });
  }

  async update(
    id: string,
    data: { name?: string; type?: string; accountNumber?: string },
  ) {
    return this.prisma.paymentAccount.update({
      where: { id },
      data,
    });
  }
}
