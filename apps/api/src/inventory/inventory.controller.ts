import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateTankDto } from './dto/create-tank.dto';
import { CreateNozzleDto } from './dto/create-nozzle.dto';
import { PurchaseProductDto } from './dto/purchase-product.dto';
import { CreateTankDipDto } from './dto/create-tank-dip.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles(Role.MANAGER, Role.ADMIN)
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products')
  getProducts() {
    return this.inventoryService.getProducts();
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Post('tanks')
  createTank(@Body() dto: CreateTankDto) {
    return this.inventoryService.createTank(dto);
  }

  @Get('tanks')
  getTanks() {
    return this.inventoryService.getTanks();
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Post('nozzles')
  createNozzle(@Body() dto: CreateNozzleDto) {
    return this.inventoryService.createNozzle(dto);
  }

  @Get('nozzles')
  getNozzles() {
    return this.inventoryService.getNozzles();
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Post('purchase')
  purchaseProduct(@Request() req: any, @Body() dto: PurchaseProductDto) {
    return this.inventoryService.purchaseProduct(req.user.sub, dto);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Post('dip')
  recordDip(@Request() req: any, @Body() dto: CreateTankDipDto) {
    return this.inventoryService.recordDip(req.user.sub, dto);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: { price: number }) {
    return this.inventoryService.updateProduct(id, dto.price);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Delete('tanks/:id')
  deleteTank(@Param('id') id: string) {
    return this.inventoryService.deleteTank(id);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Delete('nozzles/:id')
  deleteNozzle(@Param('id') id: string) {
    return this.inventoryService.deleteNozzle(id);
  }
}
