import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditCustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.creditCustomer.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
