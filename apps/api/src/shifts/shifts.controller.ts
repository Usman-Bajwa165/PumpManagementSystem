import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    role: Role;
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Post('start')
  async startShift(@Request() req: AuthenticatedRequest) {
    return this.shiftsService.startShift(req.user.id);
  }

  @Get('current')
  async getCurrentShift() {
    return this.shiftsService.getCurrentShift();
  }

  @Get('auto-close-status')
  async getAutoCloseStatus() {
    return this.shiftsService.getAutoCloseStatus();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('toggle-auto-close')
  async toggleAutoClose(
    @Body()
    body: {
      enabled: boolean;
      startTime?: string;
      endTime?: string;
    },
  ) {
    return this.shiftsService.toggleAutoClose(
      body.enabled,
      body.startTime,
      body.endTime,
    );
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Post('end')
  async endShift(
    @Request() req: AuthenticatedRequest,
    @Body() body: { readings: { nozzleId: string; closingReading: number }[] },
  ) {
    return this.shiftsService.closeShift(req.user.id, body.readings);
  }
  @Get()
  async findAll() {
    return this.shiftsService.findAll();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('schedules')
  async getSchedules() {
    return this.shiftsService.getSchedules();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('schedules')
  async addSchedule(
    @Body() data: { dayOfWeek: number; startTime: string; endTime: string },
  ) {
    return this.shiftsService.addSchedule(data);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('schedules/:id/toggle')
  async toggleSchedule(
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.shiftsService.toggleSchedule(id, enabled);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete('schedules/:id')
  async deleteSchedule(@Param('id') id: string) {
    return this.shiftsService.deleteSchedule(id);
  }
}
