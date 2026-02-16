import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('status')
  async getStatus() {
    const status = this.whatsappService.getStatus();
    const connectedNumber = await this.whatsappService.getConnectedNumber();
    return { ...status, connectedNumber };
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('qr')
  getQR() {
    return this.whatsappService.getQRCode();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('preferences')
  async savePreferences(@Body() data: any) {
    const phoneNumber = data.phoneNumber || '923000000000';
    const existing = await this.prisma.notificationPreferences.findFirst();
    
    if (existing) {
      return this.prisma.notificationPreferences.update({
        where: { id: existing.id },
        data: { ...data, phoneNumber },
      });
    }
    
    return this.prisma.notificationPreferences.create({ 
      data: { ...data, phoneNumber } 
    });
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('preferences')
  async getPreferences() {
    return this.prisma.notificationPreferences.findFirst();
  }
}
