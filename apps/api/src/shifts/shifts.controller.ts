import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Post('start')
  async startShift(@Request() req: any) {
    return this.shiftsService.startShift(req.user.sub); // userId from JWT
  }

  @Get('current')
  async getCurrentShift() {
    return this.shiftsService.getCurrentShift();
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Post('end')
  async endShift(
    @Request() req: any,
    @Body() body: { readings: { nozzleId: string; closingReading: number }[] },
  ) {
    return this.shiftsService.closeShift(req.user.sub, body.readings);
  }
}
