import { Controller, Post, Get, UseGuards, Body } from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('backup')
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('manual')
  async createManualBackup() {
    return this.backupService.performManualBackup();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('full')
  async createFullBackup() {
    return this.backupService.performFullBackup();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('list')
  listBackups() {
    return {
      backups: this.backupService.listBackups(),
      location: this.backupService.getBackupLocation(),
    };
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('location')
  getBackupLocation() {
    return {
      location: this.backupService.getBackupLocation(),
    };
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('config')
  async getBackupConfig() {
    const prefs = await this.prisma.notificationPreferences.findFirst();
    return {
      nightTime: prefs?.autoBackupNightTime || '00:00',
      dayTime: prefs?.autoBackupDayTime || '12:00',
      syncWithShift: prefs?.backupOnShiftClose || false,
    };
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('config')
  async updateBackupConfig(
    @Body()
    body: {
      nightTime?: string;
      dayTime?: string;
      syncWithShift?: boolean;
    },
  ) {
    const prefs = await this.prisma.notificationPreferences.findFirst();
    if (!prefs) {
      return {};
    }

    const normalize = (value: string, fallback: string) =>
      (value || fallback).slice(0, 5).padStart(5, '0');

    const nightTime = normalize(
      body.nightTime || prefs.autoBackupNightTime,
      '00:00',
    );
    const dayTime = normalize(
      body.dayTime || prefs.autoBackupDayTime,
      '12:00',
    );

    const updated = await this.prisma.notificationPreferences.update({
      where: { id: prefs.id },
      data: {
        autoBackupNightTime: nightTime,
        autoBackupDayTime: dayTime,
        backupOnShiftClose:
          typeof body.syncWithShift === 'boolean'
            ? body.syncWithShift
            : prefs.backupOnShiftClose,
      },
    });

    return {
      nightTime: updated.autoBackupNightTime,
      dayTime: updated.autoBackupDayTime,
      syncWithShift: updated.backupOnShiftClose,
    };
  }
}
