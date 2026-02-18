import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentAccountsService } from './payment-accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-accounts')
export class PaymentAccountsController {
  constructor(private service: PaymentAccountsService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() data: { name: string; type: string; accountNumber?: string }) {
    return this.service.create(data);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; type?: string; accountNumber?: string },
  ) {
    return this.service.update(id, data);
  }
}
