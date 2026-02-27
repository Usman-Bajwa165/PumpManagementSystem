import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CreditCustomersService } from './credit-customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('credit-customers')
export class CreditCustomersController {
  constructor(private readonly service: CreditCustomersService) {}

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: { vehicleNumber?: string; contact?: string; email?: string },
  ) {
    return this.service.update(id, data);
  }
}
