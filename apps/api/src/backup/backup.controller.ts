import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

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
}
