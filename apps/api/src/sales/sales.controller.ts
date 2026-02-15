import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
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

  @Roles(Role.MANAGER, Role.OPERATOR)
  @Post()
  createSale(@Request() req: any, @Body() dto: CreateSaleDto) {
    return this.salesService.createSale(req.user.sub, dto);
  }
}
