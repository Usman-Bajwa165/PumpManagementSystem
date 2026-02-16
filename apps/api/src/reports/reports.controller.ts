import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('ledger/:accountId')
  getLedger(
    @Param('accountId') accountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getLedger(
      accountId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('balance-sheet')
  getBalanceSheet() {
    return this.reportsService.getBalanceSheet();
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('profit-loss')
  getProfitLoss(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getProfitLoss(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('daily-summary/:shiftId')
  getDailySummary(@Param('shiftId') shiftId: string) {
    return this.reportsService.getDailySaleSummary(shiftId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('dashboard-summary')
  getDashboardSummary() {
    return this.reportsService.getDashboardSummary();
  }
}
