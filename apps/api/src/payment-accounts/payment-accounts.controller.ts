import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Post,
  Req,
  Query,
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
  create(
    @Body()
    data: {
      name: string;
      type: string;
      accountNumber?: string;
      balance?: number;
    },
    @Req() req: { user?: { userId?: string; sub?: string } },
  ) {
    return this.service.create(data, req.user?.userId || req.user?.sub);
  }

  @Get('logs')
  getLogs(
    @Query('accountId') accountId?: string,
    @Query('type') type?: string,
    @Query('subType') subType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getLogs(accountId, type, subType, startDate, endDate);
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

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      type?: string;
      accountNumber?: string;
      balance?: number;
    },
    @Req() req: { user?: { userId?: string; sub?: string } },
  ) {
    return this.service.update(id, data, req.user?.userId || req.user?.sub);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  updatePut(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      type?: string;
      accountNumber?: string;
      balance?: number;
    },
    @Req() req: { user?: { userId?: string; sub?: string } },
  ) {
    return this.service.update(id, data, req.user?.userId || req.user?.sub);
  }
}
