import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsappService.name);
  private isReady = false;
  private qrCode: string | null = null;
  private authStatus: 'pending' | 'authenticated' | 'ready' | 'failed' = 'pending';

  constructor(private prisma: PrismaService) {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth', // Store in api root, not src
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
  }

  onModuleInit() {
    this.initialize();
  }

  private initialize() {
    this.client.on('qr', (qr) => {
      this.logger.log('WhatsApp QR Code generated');
      this.qrCode = qr;
      this.authStatus = 'pending';
    });

    this.client.on('ready', () => {
      this.logger.log('WhatsApp Client is ready!');
      this.isReady = true;
      this.authStatus = 'ready';
      this.qrCode = null;
    });

    this.client.on('authenticated', () => {
      this.logger.log('WhatsApp Client authenticated!');
      this.authStatus = 'authenticated';
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('WhatsApp Authentication failed: ' + msg);
      this.authStatus = 'failed';
      this.qrCode = null;
    });

    this.client.initialize().catch((err) => {
      this.logger.error('Failed to initialize WhatsApp client: ' + err.message);
      this.authStatus = 'failed';
    });
  }

  async queueMessage(to: string, message: string) {
    return this.prisma.notificationQueue.create({
      data: { to, message },
    });
  }

  async sendMessage(to: string, message: string) {
    if (!this.isReady) {
      this.logger.warn('WhatsApp client not ready. Queuing message...');
      await this.queueMessage(to, message);
      return false;
    }

    try {
      const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
      await this.client.sendMessage(chatId, message);
      this.logger.log(`Message sent to ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send message to ${to}: ${err.message}`);
      await this.queueMessage(to, message);
      return false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processQueue() {
    if (!this.isReady) return;

    const pending = await this.prisma.notificationQueue.findMany({
      where: { status: 'PENDING', retries: { lt: 5 } },
      take: 10,
    });

    for (const item of pending) {
      try {
        const chatId = item.to.includes('@c.us') ? item.to : `${item.to}@c.us`;
        await this.client.sendMessage(chatId, item.message);
        await this.prisma.notificationQueue.update({
          where: { id: item.id },
          data: { status: 'SENT' },
        });
        this.logger.log(`Queued message sent to ${item.to}`);
      } catch (err: any) {
        await this.prisma.notificationQueue.update({
          where: { id: item.id },
          data: {
            retries: { increment: 1 },
            lastError: err.message,
            status: item.retries >= 4 ? 'FAILED' : 'PENDING',
          },
        });
      }
    }
  }

  async notifySale(to: string, amount: number, method: string) {
    const msg = `⚡ *Pump Sale Alert* ⚡\nAmount: Rs. ${amount}\nMethod: ${method}\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  async notifyShiftEnd(to: string, summary: any) {
    const msg = `🏁 *Shift Closed* 🏁\nShift ID: ${summary.shiftId}\nTotal Sales: Rs. ${summary.totalSales}\nCash: Rs. ${summary.cashSales}\nCredit: Rs. ${summary.creditSales}\nTime: ${new Date().toLocaleString()}`;
    return this.sendMessage(to, msg);
  }

  async notifyBackup(to: string, data: { filename: string; size: string; path: string; type: string; user: string }) {
    const msg = `📦 *Backup Created* 📦\nType: ${data.type}\nFile: ${data.filename}\nSize: ${data.size}\nLocation: ${data.path}\nBy: ${data.user}\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  async notifyCashPayment(to: string, data: { customer: string; amount: number; method: string }) {
    const msg = `💰 *Payment Received* 💰\nCustomer: ${data.customer}\nAmount: Rs. ${data.amount}\nMethod: ${data.method}\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  async notifyCreditSale(to: string, data: { customer: string; amount: number }) {
    const msg = `📝 *Credit Sale* 📝\nCustomer: ${data.customer}\nAmount: Rs. ${data.amount}\nStatus: Payment Pending\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  getStatus() {
    return {
      isReady: this.isReady,
      status: this.authStatus,
      hasQR: !!this.qrCode,
    };
  }

  getQRCode() {
    return {
      qrCode: this.qrCode,
      status: this.authStatus,
    };
  }
}
