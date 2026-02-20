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

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('dashboard-summary')
  getDashboardSummary() {
    return this.reportsService.getDashboardSummary();
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('sales')
  getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('viewMode') viewMode?: string,
    @Query('shiftId') shiftId?: string,
    @Query('nozzleId') nozzleId?: string,
    @Query('productId') productId?: string,
    @Query('paymentType') paymentType?: string,
  ) {
    return this.reportsService.getSalesReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      viewMode,
      shiftId,
      nozzleId,
      productId,
      paymentType,
    );
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('purchase')
  getPurchaseReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('supplierId') supplierId?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('productId') productId?: string,
  ) {
    return this.reportsService.getPurchaseReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      supplierId,
      paymentStatus,
      productId,
    );
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('ledger/supplier/:id')
  getSupplierLedger(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSupplierLedger(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('ledger/customer/:id')
  getCustomerLedger(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getCustomerLedger(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('trial-balance')
  getTrialBalance() {
    return this.reportsService.getTrialBalance();
  }
}
