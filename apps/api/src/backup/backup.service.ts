import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLogger } from '../logger/custom-logger.service';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';

@Injectable()
export class BackupService {
  private backupDir: string;

  constructor(
    private prisma: PrismaService,
    private readonly logger: CustomLogger,
  ) {
    const homeDir = os.homedir();
    const platform = os.platform();

    if (platform === 'win32') {
      this.backupDir = path.join(homeDir, 'Documents', 'PumpBackups');
    } else if (platform === 'darwin') {
      const iCloudPath = path.join(
        homeDir,
        'Library',
        'Mobile Documents',
        'com~apple~CloudDocs',
        'PumpBackups',
      );
      const documentsPath = path.join(homeDir, 'Documents', 'PumpBackups');
      this.backupDir = fs.existsSync(path.dirname(iCloudPath))
        ? iCloudPath
        : documentsPath;
    } else {
      this.backupDir = path.join(homeDir, 'Documents', 'PumpBackups');
    }

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Backup directory created: ${this.backupDir}`);
    }
  }

  @Cron('0 0 * * *')
  async performNightBackup() {
    await this.performBackup('N');
  }

  @Cron('0 12 * * *')
  async performDayBackup() {
    await this.performBackup('D');
  }

  @Cron('0 0 1 * *') // First day of every month at midnight
  async performMonthlyFullBackup() {
    await this.performFullBackup(true); // true = automatic
  }

  async performBackup(period: 'D' | 'N') {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);

    const filename = `Auto_${day}${month}${year}_${period}.pdf`;
    const backupFile = path.join(this.backupDir, filename);

    try {
      this.logger.log(
        `Starting ${period === 'D' ? 'day' : 'night'} backup...`,
        'BackupService',
      );
      await this.generatePDFBackup(backupFile, 'Automatic', period, false);

      const stats = fs.statSync(backupFile);
      const sizeKB = (stats.size / 1024).toFixed(2);

      this.logger.logBusinessOperation(
        'BACKUP_AUTO',
        `${filename} created (${sizeKB} KB)`,
        undefined,
        true,
      );

      this.sendBackupNotification({
        filename,
        size: `${sizeKB} KB`,
        path: this.backupDir,
        type: 'Automatic',
        user: 'System',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Backup failed: ${filename}`,
        errorMsg,
        'BackupService',
      );
    }
  }

  async performManualBackup(): Promise<{
    success: boolean;
    filename?: string;
    error?: string;
  }> {
    try {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const period = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours % 12 || 12;
      const formattedHours = String(displayHours).padStart(2, '0');

      const filename = `Man_${day}${month}${year}_${formattedHours}:${minutes}${period}.pdf`;
      const backupFile = path.join(this.backupDir, filename);

      this.logger.log('Starting manual backup...', 'BackupService');
      await this.generatePDFBackup(backupFile, 'Manual', undefined, false);

      const stats = fs.statSync(backupFile);
      const sizeKB = (stats.size / 1024).toFixed(2);

      this.logger.logBusinessOperation(
        'BACKUP_MANUAL',
        `${filename} created (${sizeKB} KB)`,
        undefined,
        true,
      );

      this.sendBackupNotification({
        filename,
        size: `${sizeKB} KB`,
        path: this.backupDir,
        type: 'Manual',
        user: 'Admin/Manager',
      });

      return { success: true, filename };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Manual backup failed`, errorMsg, 'BackupService');
      return { success: false, error: errorMsg };
    }
  }

  async performFullBackup(
    isAutomatic: boolean = false,
  ): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
      const now = new Date();
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const monthName = monthNames[now.getMonth()];
      const year = now.getFullYear();

      let filename: string;
      if (isAutomatic) {
        filename = `Full_Auto_${monthName}-${year}.pdf`;
      } else {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const yearShort = String(year).slice(-2);
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        const formattedHours = String(displayHours).padStart(2, '0');
        filename = `Full_Man_${day}${month}${yearShort}_${formattedHours}:${minutes}${period}.pdf`;
      }

      const backupFile = path.join(this.backupDir, filename);

      this.logger.log(
        `Starting ${isAutomatic ? 'automatic monthly' : 'manual'} full database backup...`,
        'BackupService',
      );
      await this.generatePDFBackup(
        backupFile,
        isAutomatic ? 'Automatic Monthly Full' : 'Manual Full Database',
        undefined,
        true,
      );

      const stats = fs.statSync(backupFile);
      const sizeKB = (stats.size / 1024).toFixed(2);

      this.logger.logBusinessOperation(
        isAutomatic ? 'BACKUP_FULL_AUTO' : 'BACKUP_FULL_MANUAL',
        `${filename} created (${sizeKB} KB)`,
        undefined,
        true,
      );

      this.sendBackupNotification({
        filename,
        size: `${sizeKB} KB`,
        path: this.backupDir,
        type: isAutomatic ? 'Automatic Monthly Full' : 'Manual Full Database',
        user: isAutomatic ? 'System' : 'Admin/Manager',
      });

      return { success: true, filename };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Full backup failed`, errorMsg, 'BackupService');
      return { success: false, error: errorMsg };
    }
  }

  private async generatePDFBackup(
    filePath: string,
    type: string,
    period?: 'D' | 'N',
    isFull: boolean = false,
  ) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const now = new Date();
    const formattedDate = now.toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'full',
      timeStyle: 'long',
    });

    // Get last auto backup timestamp for incremental backups
    let sinceDate: Date | undefined;
    if (!isFull) {
      sinceDate = this.getLastAutoBackupDate();
    }

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('PETROL PUMP MANAGEMENT SYSTEM', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(18)
      .fillColor('#666')
      .text(isFull ? 'Complete Database Backup' : 'Incremental Backup', {
        align: 'center',
      });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#999')
      .text(
        `${type} Backup${period ? ` (${period === 'D' ? 'Day - 12:00 PM' : 'Night - 12:00 AM'})` : ''}`,
        { align: 'center' },
      );
    doc.fontSize(10).text(`Generated: ${formattedDate}`, { align: 'center' });
    if (sinceDate) {
      doc
        .fontSize(9)
        .fillColor('#666')
        .text(
          `Data since: ${sinceDate.toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`,
          { align: 'center' },
        );
    }
    doc.moveDown(2);

    // Users (always all users)
    const users = await this.prisma.user.findMany();
    this.addSection(doc, 'USERS', users.length);
    users.forEach((user, idx) => {
      doc
        .fontSize(10)
        .fillColor('#000')
        .text(`${idx + 1}. ${user.username} (${user.role})`, { indent: 20 });
    });
    doc.moveDown();

    // Shifts (filtered by date for incremental)
    const shiftsWhere = sinceDate ? { startTime: { gte: sinceDate } } : {};
    const shifts = await this.prisma.shift.findMany({
      where: shiftsWhere,
      include: { opener: true, closer: true },
      orderBy: { startTime: 'desc' },
    });
    this.addSection(
      doc,
      isFull ? 'ALL SHIFTS' : 'SHIFTS (Since Last Backup)',
      shifts.length,
    );
    shifts.forEach((shift, idx) => {
      const status = shift.status === 'OPEN' ? '🟢 OPEN' : '🔴 CLOSED';
      const startTime = new Date(shift.startTime).toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
      });
      const endTime = shift.endTime
        ? new Date(shift.endTime).toLocaleString('en-PK', {
            timeZone: 'Asia/Karachi',
          })
        : 'N/A';
      doc
        .fontSize(8)
        .fillColor('#000')
        .text(
          `${idx + 1}. ${status} | Opened: ${shift.opener.username} | Start: ${startTime} | End: ${endTime}`,
          { indent: 20 },
        );
    });
    doc.moveDown();

    // Products (always all products)
    const products = await this.prisma.product.findMany();
    this.addSection(doc, 'PRODUCTS', products.length);
    products.forEach((product, idx) => {
      doc
        .fontSize(10)
        .fillColor('#000')
        .text(
          `${idx + 1}. ${product.name} - Selling: Rs. ${product.sellingPrice.toString()}/L, Purchase: Rs. ${product.purchasePrice.toString()}/L`,
          {
            indent: 20,
          },
        );
    });
    doc.moveDown();

    // Tanks (always current state)
    const tanks = await this.prisma.tank.findMany({
      include: { product: true },
    });
    this.addSection(doc, 'INVENTORY - TANKS (Current State)', tanks.length);
    tanks.forEach((tank, idx) => {
      const percentage = (
        (Number(tank.currentStock) / Number(tank.capacity)) *
        100
      ).toFixed(1);
      doc
        .fontSize(9)
        .fillColor('#000')
        .text(
          `${idx + 1}. ${tank.name} (${tank.product.name}) | Stock: ${tank.currentStock.toString()}L / ${tank.capacity.toString()}L (${percentage}%)`,
          { indent: 20 },
        );
    });
    doc.moveDown();

    // Nozzles (always current state)
    const nozzles = await this.prisma.nozzle.findMany({
      include: { tank: { include: { product: true } } },
    });
    this.addSection(doc, 'NOZZLES (Current State)', nozzles.length);
    nozzles.forEach((nozzle, idx) => {
      doc
        .fontSize(9)
        .fillColor('#000')
        .text(
          `${idx + 1}. ${nozzle.name} | Tank: ${nozzle.tank.name} (${nozzle.tank.product.name}) | Last Reading: ${nozzle.lastReading.toString()}`,
          { indent: 20 },
        );
    });
    doc.moveDown();

    // Accounts (always current state)
    const accounts = await this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });
    this.addSection(doc, 'CHART OF ACCOUNTS (Current State)', accounts.length);
    accounts.forEach((account, idx) => {
      doc
        .fontSize(9)
        .fillColor('#000')
        .text(
          `${idx + 1}. [${account.code}] ${account.name} (${account.type}) - Balance: Rs. ${account.balance.toString()}`,
          { indent: 20 },
        );
    });
    doc.moveDown();

    // Transactions (filtered by date for incremental)
    const transactionsWhere = sinceDate
      ? { createdAt: { gte: sinceDate } }
      : {};
    const transactions = await this.prisma.transaction.findMany({
      where: transactionsWhere,
      include: { debitAccount: true, creditAccount: true },
      orderBy: { createdAt: 'desc' },
    });
    this.addSection(
      doc,
      isFull ? 'ALL TRANSACTIONS' : 'TRANSACTIONS (Since Last Backup)',
      transactions.length,
    );
    transactions.forEach((tx, idx) => {
      const date = new Date(tx.createdAt).toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
      });
      doc
        .fontSize(7)
        .fillColor('#000')
        .text(
          `${idx + 1}. Rs. ${tx.amount.toString()} | Dr: ${tx.debitAccount.name} | Cr: ${tx.creditAccount.name} | ${date}`,
          { indent: 20 },
        );
      if ((idx + 1) % 40 === 0 && idx < transactions.length - 1) {
        doc.addPage();
      }
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999').text('─'.repeat(80), { align: 'center' });
    doc
      .fontSize(8)
      .text('© 2026 Petrol Pump Management System | All Rights Reserved', {
        align: 'center',
      });
    doc
      .fontSize(7)
      .text(
        `Total Records: ${users.length + shifts.length + products.length + tanks.length + nozzles.length + accounts.length + transactions.length}`,
        { align: 'center' },
      );

    doc.end();
    return new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  private getLastAutoBackupDate(): Date | undefined {
    try {
      const files = fs.readdirSync(this.backupDir);
      const autoBackups = files
        .filter((f) => f.startsWith('Auto_') && f.endsWith('.pdf'))
        .map((f) => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          return stats.mtime;
        })
        .sort((a, b) => b.getTime() - a.getTime());

      return autoBackups.length > 0 ? autoBackups[0] : undefined;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get last backup date: ${errorMsg}`);
      return undefined;
    }
  }

  private addSection(doc: PDFKit.PDFDocument, title: string, count: number) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text(`${title} (${count})`);
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#ccc').text('─'.repeat(100));
    doc.moveDown(0.5);
  }

  getBackupLocation() {
    return this.backupDir;
  }

  listBackups(): { filename: string; size: number; date: Date }[] {
    try {
      const files = fs.readdirSync(this.backupDir);
      return files
        .filter((f) => f.endsWith('.pdf'))
        .map((f) => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            filename: f,
            size: stats.size,
            date: stats.mtime,
          };
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to list backups: ${errorMsg}`);
      return [];
    }
  }

  private sendBackupNotification(data: {
    filename: string;
    size: string;
    path: string;
    type: string;
    user: string;
  }) {
    try {
      // This will be injected via WhatsappService
      // For now, just log it
      this.logger.log(
        `📦 Backup notification: ${data.filename} (${data.size}) by ${data.user}`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send backup notification: ${errorMsg}`);
    }
  }
}
