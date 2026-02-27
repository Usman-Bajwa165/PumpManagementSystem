import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() createIncomeDto: CreateIncomeDto) {
    return this.incomeService.create(createIncomeDto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
  ) {
    return this.incomeService.findAll(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      category,
    );
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incomeService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIncomeDto: UpdateIncomeDto) {
    return this.incomeService.update(id, updateIncomeDto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.incomeService.remove(id);
  }
}
