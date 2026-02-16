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
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('qr')
  getQR() {
    return this.whatsappService.getQRCode();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('preferences')
  async savePreferences(@Body() data: any) {
    const existing = await this.prisma.notificationPreferences.findFirst();
    
    if (existing) {
      return this.prisma.notificationPreferences.update({
        where: { id: existing.id },
        data,
      });
    }
    
    return this.prisma.notificationPreferences.create({ data });
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('preferences')
  async getPreferences() {
    return this.prisma.notificationPreferences.findFirst();
  }
}
