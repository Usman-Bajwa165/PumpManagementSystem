import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private backupDir: string;

  constructor(private prisma: PrismaService) {
    const homeDir = os.homedir();
    const platform = os.platform();
    
    if (platform === 'win32') {
      this.backupDir = path.join(homeDir, 'Documents', 'PumpBackups');
    } else if (platform === 'darwin') {
      const iCloudPath = path.join(homeDir, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'PumpBackups');
      const documentsPath = path.join(homeDir, 'Documents', 'PumpBackups');
      this.backupDir = fs.existsSync(path.dirname(iCloudPath)) ? iCloudPath : documentsPath;
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

  async performBackup(period: 'D' | 'N') {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    
    const filename = `Auto_${day}${month}${year}_${period}.pdf`;
    const backupFile = path.join(this.backupDir, filename);

    try {
      this.logger.log(`Starting ${period === 'D' ? 'day' : 'night'} backup...`);
      await this.generatePDFBackup(backupFile, 'Automatic', period);
      
      const stats = fs.statSync(backupFile);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      this.logger.log(`✅ Backup completed: ${filename}`);
      
      // Send WhatsApp notification
      await this.sendBackupNotification({
        filename,
        size: `${sizeKB} KB`,
        path: this.backupDir,
        type: 'Automatic',
        user: 'System'
      });
    } catch (error: any) {
      this.logger.error(`❌ Backup failed: ${error.message}`);
    }
  }

  async performManualBackup(): Promise<{ success: boolean; filename?: string; error?: string }> {
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

      this.logger.log('Starting manual backup...');
      await this.generatePDFBackup(backupFile, 'Manual');
      
      const stats = fs.statSync(backupFile);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      this.logger.log(`✅ Manual backup completed: ${filename}`);
      
      // Send WhatsApp notification
      await this.sendBackupNotification({
        filename,
        size: `${sizeKB} KB`,
        path: this.backupDir,
        type: 'Manual',
        user: 'Admin/Manager'
      });
      
      return { success: true, filename };
    } catch (error: any) {
      this.logger.error(`❌ Manual backup failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async generatePDFBackup(filePath: string, type: string, period?: 'D' | 'N') {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const now = new Date();
    const formattedDate = now.toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'long' });

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('PETROL PUMP MANAGEMENT SYSTEM', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#666').text('Complete Database Backup', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#999').text(`${type} Backup${period ? ` (${period === 'D' ? 'Day - 12:00 PM' : 'Night - 12:00 AM'})` : ''}`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${formattedDate}`, { align: 'center' });
    doc.moveDown(2);

    // Users
    const users = await this.prisma.user.findMany();
    this.addSection(doc, 'USERS', users.length);
    users.forEach((user, idx) => {
      doc.fontSize(10).fillColor('#000').text(`${idx + 1}. ${user.username} (${user.role})`, { indent: 20 });
    });
    doc.moveDown();

    // All Shifts
    const shifts = await this.prisma.shift.findMany({ include: { opener: true, closer: true }, orderBy: { startTime: 'desc' } });
    this.addSection(doc, 'ALL SHIFTS', shifts.length);
    shifts.forEach((shift, idx) => {
      const status = shift.status === 'OPEN' ? '🟢 OPEN' : '🔴 CLOSED';
      const startTime = new Date(shift.startTime).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
      const endTime = shift.endTime ? new Date(shift.endTime).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : 'N/A';
      doc.fontSize(8).fillColor('#000').text(
        `${idx + 1}. ${status} | Opened: ${shift.opener.username} | Start: ${startTime} | End: ${endTime}`,
        { indent: 20 }
      );
    });
    doc.moveDown();

    // Products
    const products = await this.prisma.product.findMany();
    this.addSection(doc, 'PRODUCTS', products.length);
    products.forEach((product, idx) => {
      doc.fontSize(10).fillColor('#000').text(`${idx + 1}. ${product.name} - Rs. ${product.price}/L`, { indent: 20 });
    });
    doc.moveDown();

    // Tanks
    const tanks = await this.prisma.tank.findMany({ include: { product: true } });
    this.addSection(doc, 'INVENTORY - TANKS', tanks.length);
    tanks.forEach((tank, idx) => {
      const percentage = (Number(tank.currentStock) / Number(tank.capacity) * 100).toFixed(1);
      doc.fontSize(9).fillColor('#000').text(
        `${idx + 1}. ${tank.name} (${tank.product.name}) | Stock: ${tank.currentStock}L / ${tank.capacity}L (${percentage}%)`,
        { indent: 20 }
      );
    });
    doc.moveDown();

    // Nozzles
    const nozzles = await this.prisma.nozzle.findMany({ include: { tank: { include: { product: true } } } });
    this.addSection(doc, 'NOZZLES', nozzles.length);
    nozzles.forEach((nozzle, idx) => {
      doc.fontSize(9).fillColor('#000').text(
        `${idx + 1}. ${nozzle.name} | Tank: ${nozzle.tank.name} (${nozzle.tank.product.name}) | Last Reading: ${nozzle.lastReading}`,
        { indent: 20 }
      );
    });
    doc.moveDown();

    // Accounts
    const accounts = await this.prisma.account.findMany({ orderBy: { code: 'asc' } });
    this.addSection(doc, 'CHART OF ACCOUNTS', accounts.length);
    accounts.forEach((account, idx) => {
      doc.fontSize(9).fillColor('#000').text(
        `${idx + 1}. [${account.code}] ${account.name} (${account.type}) - Balance: Rs. ${account.balance}`,
        { indent: 20 }
      );
    });
    doc.moveDown();

    // All Transactions
    const transactions = await this.prisma.transaction.findMany({
      include: { debitAccount: true, creditAccount: true },
      orderBy: { createdAt: 'desc' }
    });
    this.addSection(doc, 'ALL TRANSACTIONS', transactions.length);
    transactions.forEach((tx, idx) => {
      const date = new Date(tx.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
      doc.fontSize(7).fillColor('#000').text(
        `${idx + 1}. Rs. ${tx.amount} | Dr: ${tx.debitAccount.name} | Cr: ${tx.creditAccount.name} | ${date}`,
        { indent: 20 }
      );
      if ((idx + 1) % 40 === 0 && idx < transactions.length - 1) {
        doc.addPage();
      }
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999').text('─'.repeat(80), { align: 'center' });
    doc.fontSize(8).text('© 2026 Petrol Pump Management System | All Rights Reserved', { align: 'center' });
    doc.fontSize(7).text(`Total Records: ${users.length + shifts.length + products.length + tanks.length + nozzles.length + accounts.length + transactions.length}`, { align: 'center' });

    doc.end();
    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  private addSection(doc: any, title: string, count: number) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text(`${title} (${count})`);
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
        .filter(f => f.endsWith('.pdf'))
        .map(f => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            filename: f,
            size: stats.size,
            date: stats.mtime,
          };
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error: any) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  private async sendBackupNotification(data: { filename: string; size: string; path: string; type: string; user: string }) {
    try {
      // This will be injected via WhatsappService
      // For now, just log it
      this.logger.log(`📦 Backup notification: ${data.filename} (${data.size}) by ${data.user}`);
    } catch (error: any) {
      this.logger.error(`Failed to send backup notification: ${error.message}`);
    }
  }
}
