import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsappService.name);
  private isReady = false;
  private qrCode: string | null = null;
  private authStatus: 'pending' | 'authenticated' | 'ready' | 'failed' =
    'pending';
  private reconnecting = false;

  constructor(private prisma: PrismaService) {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth', // Store in api root, not src
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
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

      // Get connected phone number
      void (async () => {
        try {
          const info = this.client.info;
          const phoneNumber = info.wid.user; // Phone number without @c.us
          this.logger.log(`Connected WhatsApp number: ${phoneNumber}`);

          const prefs = await this.prisma.notificationPreferences.findFirst();
          if (!prefs) {
            await this.prisma.notificationPreferences.create({
              data: {
                phoneNumber,
                salesNotifications: true,
                shiftNotifications: true,
                inventoryNotifications: true,
                stockNotifications: true,
                notifyCash: true,
                notifyCard: true,
                notifyOnline: true,
                notifyCredit: true,
                minCashAmount: 0,
                minCardAmount: 0,
                minOnlineAmount: 0,
                minCreditAmount: 0,
                autoCloseShift: false,
                autoShiftStartTime: '00:00',
                autoShiftEndTime: '12:00',
                autoBackupNightTime: '00:00',
                autoBackupDayTime: '12:00',
                backupOnShiftClose: false,
              },
            });
            this.logger.log('NotificationPreferences created');
          } else {
            if (prefs.phoneNumber !== phoneNumber) {
              await this.prisma.notificationPreferences.update({
                where: { id: prefs.id },
                data: { phoneNumber },
              });
              this.logger.log(
                `NotificationPreferences phone number updated to ${phoneNumber}`,
              );
            }
          }
        } catch (err) {
          this.logger.error('Failed to get WhatsApp info: ' + err);
        }
      })();
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

    this.client.on('disconnected', (reason) => {
      this.logger.warn('WhatsApp Client disconnected: ' + reason);
      this.isReady = false;
      this.authStatus = 'pending';

      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (!this.isReady && !this.reconnecting) {
          this.logger.log('Attempting to reconnect WhatsApp client...');
          this.handleDetachedFrame().catch((err) => {
            this.logger.error('Auto-reconnect failed: ' + err.message);
          });
        }
      }, 5000);
    });

    this.client.initialize().catch((err) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('Failed to initialize WhatsApp client: ' + msg);
      this.authStatus = 'failed';
    });
  }

  private sanitizeNumber(to: string): string {
    // Remove all non-numeric characters
    let cleaned = to.replace(/\D/g, '');

    // If it's a local Pakistani number (starting with 03 or 3)
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.substring(1);
    } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '92' + cleaned;
    }

    // Ensure it ends with @c.us if not already present
    return cleaned.includes('@c.us') ? cleaned : `${cleaned}@c.us`;
  }

  async queueMessage(to: string, message: string) {
    const sanitizedTo = this.sanitizeNumber(to);
    return this.prisma.notificationQueue.create({
      data: { to: sanitizedTo, message },
    });
  }

  async sendMessage(to: string, message: string) {
    if (!this.isReady) {
      this.logger.warn('WhatsApp client not ready. Queuing message...');
      await this.queueMessage(to, message);
      return false;
    }

    try {
      const chatId = this.sanitizeNumber(to);
      await this.client.sendMessage(chatId, message);
      this.logger.log(`Message sent to ${chatId}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send message to ${to}: ${err.message}`);

      // Handle detached frame error
      if (
        err.message?.includes('detached Frame') ||
        err.message?.includes('Execution context was destroyed')
      ) {
        this.logger.warn('Detached frame detected. Attempting to reconnect...');
        await this.handleDetachedFrame();
      }

      await this.queueMessage(to, message);
      return false;
    }
  }

  async sendFile(to: string, filePath: string, caption?: string) {
    if (!this.isReady) {
      this.logger.warn('WhatsApp client not ready. Cannot send file.');
      return false;
    }

    try {
      const media = MessageMedia.fromFilePath(filePath);
      const chatId = this.sanitizeNumber(to);
      await this.client.sendMessage(chatId, media, { caption });
      this.logger.log(`File sent to ${chatId}: ${filePath}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send file to ${to}: ${err.message}`);

      // Handle detached frame error
      if (
        err.message?.includes('detached Frame') ||
        err.message?.includes('Execution context was destroyed')
      ) {
        this.logger.warn('Detached frame detected. Attempting to reconnect...');
        await this.handleDetachedFrame();
      }

      return false;
    }
  }

  async sendMediaBuffer(
    to: string,
    buffer: Buffer,
    filename: string,
    caption?: string,
  ) {
    if (!this.isReady) {
      this.logger.warn('WhatsApp client not ready. Cannot send media buffer.');
      return false;
    }

    try {
      const media = new MessageMedia(
        'application/pdf',
        buffer.toString('base64'),
        filename,
      );
      const chatId = this.sanitizeNumber(to);
      await this.client.sendMessage(chatId, media, { caption });
      this.logger.log(`Media buffer sent to ${chatId}: ${filename}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send media buffer to ${to}: ${err.message}`);
      return false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processQueue() {
    if (!this.isReady || this.reconnecting) return;

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
        // Handle detached frame in queue processing
        if (
          err.message?.includes('detached Frame') ||
          err.message?.includes('Execution context was destroyed')
        ) {
          this.logger.warn(
            'Detached frame in queue processing. Stopping queue and reconnecting...',
          );
          await this.handleDetachedFrame();
          break; // Stop processing queue
        }

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

  async notifySale(
    to: string,
    amount: number,
    method: string,
    customerName?: string,
    vehicleNumber?: string,
    accountName?: string,
  ) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Karachi',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi',
    });

    let msg = `⚡ *Pump Sale Alert* ⚡\nAmount: Rs. ${amount}\nMethod: ${method}`;
    if (customerName) msg += `\nCustomer: ${customerName}`;
    if (vehicleNumber) msg += `\nVehicle: ${vehicleNumber}`;
    if (accountName) msg += `\nAccount: ${accountName}`;
    msg += `\nOn: ${dateStr} ${timeStr}`;
    return this.sendMessage(to, msg);
  }

  async notifyShiftEnd(to: string, summary: any) {
    const msg = `🏁 *Shift Closed* 🏁\nShift ID: ${summary.shiftId}\nTotal Sales: Rs. ${summary.totalSales}\nCash: Rs. ${summary.cashSales}\nCard: Rs. ${summary.cardSales}\nOnline: Rs. ${summary.onlineSales}\nCredit: Rs. ${summary.creditSales}\nTime: ${new Date().toLocaleString()}`;
    return this.sendMessage(to, msg);
  }

  async notifyBackup(
    to: string,
    data: {
      filename: string;
      size: string;
      path: string;
      type: string;
      user: string;
    },
  ) {
    const msg = `📦 *Backup Created* 📦\nType: ${data.type}\nFile: ${data.filename}\nSize: ${data.size}\nLocation: ${data.path}\nBy: ${data.user}\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  async notifyCashPayment(
    to: string,
    data: {
      customer: string;
      amount: number;
      method: string;
      remainingAmount?: number;
    },
  ) {
    let msg = `💰 *Payment Received* 💰\nCustomer: ${data.customer}\nAmount: Rs. ${data.amount}\nMethod: ${data.method}`;
    if (data.remainingAmount !== undefined) {
      msg += `\nRemaining: Rs. ${data.remainingAmount.toLocaleString()}`;
    }
    msg += `\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  async notifySupplierPayment(
    to: string,
    data: {
      supplier: string;
      amount: number;
      method: string;
      remainingAmount?: number;
    },
  ) {
    let msg = `💸 *Supplier Payment* 💸\nSupplier: ${data.supplier}\nAmount: Rs. ${data.amount}\nMethod: ${data.method}`;
    if (data.remainingAmount !== undefined) {
      msg += `\nRemaining: Rs. ${data.remainingAmount.toLocaleString()}`;
    }
    msg += `\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  async notifyCreditSale(
    to: string,
    data: { customer: string; amount: number },
  ) {
    const msg = `📝 *Credit Sale* 📝\nCustomer: ${data.customer}\nAmount: Rs. ${data.amount}\nStatus: Payment Pending\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  async getConnectedNumber(): Promise<string | null> {
    if (!this.isReady) return null;
    try {
      const info = this.client.info;
      return info.wid.user;
    } catch (err) {
      return null;
    }
  }

  async notifyReadingChange(
    to: string,
    data: {
      nozzle: string;
      systemReading: number;
      newReading: number;
      user: string;
      shift: string;
    },
  ) {
    const msg = `⚠️ *Nozzle Reading Changed* ⚠️\nNozzle: ${data.nozzle}\nSystem Reading: ${data.systemReading}L\nChanged To: ${data.newReading}L\nBy: ${data.user}\nShift: ${data.shift}\nTime: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
    return this.sendMessage(to, msg);
  }

  async notifyStockChange(
    to: string,
    data: {
      action: string;
      user: string;
      quantity: number;
      amount: number;
      available: number;
      tank: string;
      method?: string;
    },
  ) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Karachi',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi',
    });

    let msg = `📦 *Stock ${data.action}* 📦\n${data.action} By: ${data.user}\nQuantity: ${data.quantity}L\nAmount: Rs. ${data.amount}\nNow Available: ${data.available}L\nTank: ${data.tank}`;
    if (data.method) msg += `\nStatus: ${data.method}`;
    msg += `\nOn: ${dateStr} ${timeStr}`;
    return this.sendMessage(to, msg);
  }

  async notifyLowFuel(
    to: string,
    tankName: string,
    productName: string,
    currentStock: number,
    capacity: number,
    percentage: number,
  ) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Karachi',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi',
    });

    const msg = `⚠️ *LOW FUEL ALERT* ⚠️\nTank: ${tankName}\nProduct: ${productName}\nCurrent: ${currentStock.toFixed(2)}L\nCapacity: ${capacity}L\nLevel: ${percentage.toFixed(1)}%\n⚠️ REFILL REQUIRED\nOn: ${dateStr} ${timeStr}`;
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

  private async handleDetachedFrame() {
    if (this.reconnecting) {
      this.logger.warn('Reconnection already in progress...');
      return;
    }

    this.reconnecting = true;
    this.isReady = false;
    this.authStatus = 'pending';

    try {
      this.logger.log('Destroying current WhatsApp client...');
      await this.client.destroy();

      this.logger.log('Waiting 3 seconds before reinitializing...');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      this.logger.log('Reinitializing WhatsApp client...');
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: './.wwebjs_auth',
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      this.initialize();
      this.logger.log('WhatsApp client reinitialized successfully');
    } catch (err) {
      this.logger.error(
        'Failed to reinitialize WhatsApp client: ' + (err as Error).message,
      );
    } finally {
      this.reconnecting = false;
    }
  }
}
