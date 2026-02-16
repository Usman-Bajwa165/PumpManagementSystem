import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Post()
  createSale(@Request() req: any, @Body() dto: CreateSaleDto) {
    return this.salesService.createSale(req.user.sub, dto);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Get('credit-customers')
  getCreditCustomers() {
    return this.salesService.getCreditCustomers();
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Post('clear-credit')
  clearCredit(@Request() req: any, @Body() dto: { customerName: string; amount: number }) {
    return this.salesService.clearCredit(req.user.sub, dto);
  }
}
