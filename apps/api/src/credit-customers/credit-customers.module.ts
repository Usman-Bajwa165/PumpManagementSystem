import { Module } from '@nestjs/common';
import { CreditCustomersService } from './credit-customers.service';
import { CreditCustomersController } from './credit-customers.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditCustomersController],
  providers: [CreditCustomersService],
})
export class CreditCustomersModule {}
