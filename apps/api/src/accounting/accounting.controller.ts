import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('balance-sheet')
  async getBalanceSheet() {
    return this.accountingService.getBalanceSheet();
  }

  // ========== CHART OF ACCOUNTS MANAGEMENT ==========

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('accounts')
  async getAllAccounts() {
    return this.accountingService.getAllAccounts();
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('accounts/:id')
  async getAccountById(@Param('id') id: string) {
    return this.accountingService.getAccountById(id);
  }

  @Roles(Role.ADMIN)
  @Post('accounts')
  async createAccount(@Body() dto: CreateAccountDto, @Request() req) {
    return this.accountingService.createAccount(dto, req.user.userId);
  }

  @Roles(Role.ADMIN)
  @Put('accounts/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @Request() req,
  ) {
    return this.accountingService.updateAccount(id, dto, req.user.userId);
  }

  @Roles(Role.ADMIN)
  @Delete('accounts/:id')
  async deleteAccount(@Param('id') id: string, @Request() req) {
    return this.accountingService.deleteAccount(id, req.user.userId);
  }

  @Roles(Role.ADMIN)
  @Post('accounts/:id/reset-balance')
  async resetAccountBalance(@Param('id') id: string, @Request() req) {
    return this.accountingService.resetAccountBalance(id, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('payment-accounts')
  async getPaymentAccounts() {
    return this.accountingService.getPaymentAccounts();
  }
}
