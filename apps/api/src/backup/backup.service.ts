import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLogger } from '../logger/custom-logger.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
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
    private whatsapp: WhatsappService,
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

  @Cron(CronExpression.EVERY_MINUTE)
  async performScheduledBackups() {
    try {
      const prefs = await this.prisma.notificationPreferences.findFirst();
      if (!prefs) {
        return;
      }

      const now = new Date();
      const timeString = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Karachi',
      });

      const nightTime = prefs.autoBackupNightTime || '00:00';
      const dayTime = prefs.autoBackupDayTime || '12:00';

      if (timeString === nightTime) {
        await this.performBackup('N');
      }

      if (timeString === dayTime) {
        await this.performBackup('D');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Scheduled backup check failed`,
        errorMsg,
        'BackupService',
      );
    }
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

      await this.sendBackupNotification({
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

      const filename = `Man_${day}${month}${year}_${formattedHours}-${minutes}${period}.pdf`;
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

      await this.sendBackupNotification({
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
        filename = `Full_Man_${day}${month}${yearShort}_${formattedHours}-${minutes}${period}.pdf`;
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

      await this.sendBackupNotification({
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
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const stream = fs.createWriteStream(filePath);

        stream.on('error', (err) => {
          this.logger.error('Stream error', err.message, 'BackupService');
          reject(err);
        });

        stream.on('finish', () => {
          this.logger.log(`PDF written successfully: ${filePath}`, 'BackupService');
          resolve();
        });

        doc.pipe(stream);

        const now = new Date();
        const formattedDate = now.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Karachi',
        });

        let sinceDate: Date | undefined;
        if (!isFull) {
          sinceDate = this.getLastAutoBackupDate();
        }

        // Header
        doc.rect(0, 0, doc.page.width, 100).fill('#1e40af');
        doc.fontSize(24).fillColor('#ffffff').font('Helvetica-Bold')
          .text('PETROL PUMP MANAGEMENT', 40, 30, { align: 'center' });
        doc.fontSize(14).fillColor('#93c5fd')
          .text(isFull ? 'COMPLETE DATABASE BACKUP' : 'INCREMENTAL BACKUP', { align: 'center' });
        doc.fontSize(9).fillColor('#e0e7ff')
          .text(`Generated: ${formattedDate}`, 40, 75, { align: 'right' });
        if (sinceDate) {
          const formattedSince = sinceDate.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Karachi',
          });
          doc.text(`Data Since: ${formattedSince}`, { align: 'right' });
        }
        doc.moveDown(3);

        // Users
        const users = await this.prisma.user.findMany();
        this.addSectionHeader(doc, 'SYSTEM USERS', '#10b981');
        this.addTable(doc, ['#', 'Username', 'Role', 'Status'], users.map((u, i) => [
          (i + 1).toString(),
          u.username,
          u.role,
          'Active'
        ]));
        doc.moveDown();

        // Shifts
        const shiftsWhere = sinceDate ? { startTime: { gte: sinceDate } } : {};
        const shifts = await this.prisma.shift.findMany({
          where: shiftsWhere,
          include: { opener: true, closer: true, readings: { include: { nozzle: true } } },
          orderBy: { startTime: 'desc' },
          take: isFull ? undefined : 50,
        });
        this.addSectionHeader(doc, 'SHIFT RECORDS', '#f59e0b');
        for (const shift of shifts) {
          const startTime = new Date(shift.startTime).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          const endTime = shift.endTime ? new Date(shift.endTime).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }) : 'Ongoing';
          doc.fontSize(10).fillColor('#000').font('Helvetica-Bold')
            .text(`Shift: ${shift.status} | Opened: ${startTime} | Closed: ${endTime}`, 50);
          doc.fontSize(9).font('Helvetica')
            .text(`Operator: ${shift.opener.username}${shift.closer ? ` | Closer: ${shift.closer.username}` : ''}`, 50);

          if (shift.readings.length > 0) {
            const readingsData = shift.readings.map(r => [
              r.nozzle.name,
              Number(r.openingReading).toFixed(2),
              r.closingReading ? Number(r.closingReading).toFixed(2) : '-',
              r.closingReading ? (Number(r.closingReading) - Number(r.openingReading)).toFixed(2) : '-'
            ]);
            this.addTable(doc, ['Nozzle', 'Opening', 'Closing', 'Sold (L)'], readingsData, 60);
          }
          doc.moveDown(0.5);
        }
        doc.moveDown();

        // Inventory
        const tanks = await this.prisma.tank.findMany({ include: { product: true, nozzles: true } });
        this.addSectionHeader(doc, 'INVENTORY STATUS', '#8b5cf6');
        const tankData = tanks.map(t => [
          t.name,
          t.product.name,
          `${Number(t.currentStock).toFixed(2)} L`,
          `${Number(t.capacity).toFixed(2)} L`,
          `${((Number(t.currentStock) / Number(t.capacity)) * 100).toFixed(1)}%`,
          t.nozzles.length.toString()
        ]);
        this.addTable(doc, ['Tank', 'Product', 'Stock', 'Capacity', 'Fill %', 'Nozzles'], tankData);
        doc.moveDown();

        // Sales Summary
        const transactionsWhere = sinceDate ? { createdAt: { gte: sinceDate } } : {};
        const salesTxs = await this.prisma.transaction.findMany({
          where: { ...transactionsWhere, product: { isNot: null } },
          include: { product: true, nozzle: true },
        });

        if (salesTxs.length > 0) {
          this.addSectionHeader(doc, 'SALES SUMMARY', '#ef4444');
          const salesByProduct = salesTxs.reduce((acc, tx) => {
            const pName = tx.product?.name || 'Unknown';
            if (!acc[pName]) acc[pName] = { qty: 0, amount: 0, count: 0 };
            acc[pName].qty += Number(tx.quantity || 0);
            acc[pName].amount += Number(tx.amount);
            acc[pName].count += 1;
            return acc;
          }, {} as Record<string, { qty: number; amount: number; count: number }>);

          const salesData = Object.entries(salesByProduct).map(([product, data]) => [
            product,
            data.count.toString(),
            `${data.qty.toFixed(2)} L`,
            `Rs. ${data.amount.toLocaleString()}`
          ]);
          this.addTable(doc, ['Product', 'Transactions', 'Quantity', 'Revenue'], salesData);

          const totalRevenue = Object.values(salesByProduct).reduce((sum, d) => sum + d.amount, 0);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#000')
            .text(`Total Revenue: Rs. ${totalRevenue.toLocaleString()}`, 50);
          doc.moveDown();
        }

        // Accounts
        const accounts = await this.prisma.account.findMany({ orderBy: { code: 'asc' } });
        this.addSectionHeader(doc, 'FINANCIAL ACCOUNTS', '#06b6d4');
        const accountData = accounts.map(a => [
          a.code,
          a.name,
          a.type,
          `Rs. ${Number(a.balance).toLocaleString()}`
        ]);
        this.addTable(doc, ['Code', 'Account Name', 'Type', 'Balance'], accountData);
        doc.moveDown();

        // Nozzle Readings
        const nozzles = await this.prisma.nozzle.findMany({
          include: { tank: { include: { product: true } } }
        });
        this.addSectionHeader(doc, 'NOZZLE READINGS', '#ec4899');
        const nozzleData = nozzles.map(n => [
          n.name,
          n.tank.product.name,
          n.tank.name,
          `${Number(n.lastReading).toFixed(2)} L`
        ]);
        this.addTable(doc, ['Nozzle', 'Product', 'Tank', 'Last Reading'], nozzleData);
        doc.moveDown();

        // Transactions
        const transactions = await this.prisma.transaction.findMany({
          where: transactionsWhere,
          include: { debitAccount: true, creditAccount: true },
          orderBy: { createdAt: 'desc' },
          take: isFull ? undefined : 100,
        });
        this.addSectionHeader(doc, 'TRANSACTION LEDGER', '#64748b');
        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i];
          const txDate = new Date(tx.createdAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          doc.fontSize(8).fillColor('#000').font('Helvetica')
            .text(`${txDate} | Rs. ${Number(tx.amount).toLocaleString()} | Dr: ${tx.debitAccount.name} | Cr: ${tx.creditAccount.name}`, 50);
          if (tx.description) {
            doc.fontSize(7).fillColor('#666').text(`  ${tx.description}`, 50);
          }
          if (i % 50 === 0 && i > 0 && i < transactions.length - 1) doc.addPage();
        }

        // Footer
        const bottom = doc.page.height - 50;
        doc.fontSize(8).fillColor('#94a3b8')
          .text('PETROL PUMP MANAGEMENT SYSTEM | SECURE DATABASE BACKUP', 40, bottom, { align: 'center' });
        doc.fontSize(7).text('© 2026 PPMS | Electronically Generated Document', { align: 'center' });

        doc.end();
      } catch (error) {
        this.logger.error('PDF generation error', error instanceof Error ? error.message : 'Unknown', 'BackupService');
        reject(error);
      }
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

  private addSectionHeader(doc: PDFKit.PDFDocument, title: string, color: string) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(color)
      .text(title, 40);
    doc.moveTo(40, doc.y + 5).lineTo(doc.page.width - 40, doc.y + 5)
      .strokeColor(color).lineWidth(2).stroke();
    doc.moveDown(0.8);
  }

  private addTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], indent = 50) {
    const colWidth = (doc.page.width - indent * 2) / headers.length;
    let y = doc.y;

    // Headers
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
    headers.forEach((h, i) => {
      doc.text(h, indent + i * colWidth, y, { width: colWidth - 5, align: 'left' });
    });
    y += 15;
    doc.moveTo(indent, y).lineTo(doc.page.width - indent, y).strokeColor('#cbd5e1').lineWidth(1).stroke();
    y += 5;

    // Rows
    doc.fontSize(8).font('Helvetica').fillColor('#000');
    rows.forEach((row, rowIdx) => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 40;
      }
      row.forEach((cell, i) => {
        doc.text(cell, indent + i * colWidth, y, { width: colWidth - 5, align: 'left' });
      });
      y += 12;
      if (rowIdx % 5 === 4) {
        doc.moveTo(indent, y).lineTo(doc.page.width - indent, y).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
        y += 3;
      }
    });
    doc.y = y + 5;
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

  private async sendBackupNotification(data: {
    filename: string;
    size: string;
    path: string;
    type: string;
    user: string;
  }) {
    try {
      const prefs = await this.prisma.notificationPreferences.findFirst();
      if (prefs && prefs.phoneNumber) {
        const filePath = path.join(data.path, data.filename);
        const caption = `📦 *System Backup Success* 📦\nType: ${data.type}\nFile: ${data.filename}\nSize: ${data.size}\nBy: ${data.user}\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;

        await this.whatsapp.sendFile(prefs.phoneNumber, filePath, caption);

        this.logger.log(`Backup file sent to WhatsApp: ${data.filename}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send backup notification: ${errorMsg}`);
    }
  }
}
