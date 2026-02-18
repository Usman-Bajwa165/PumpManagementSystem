import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLogger } from '../logger/custom-logger.service';
import { ShiftStatus } from '@prisma/client';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ReportsService } from '../reports/reports.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService,
    private reportsService: ReportsService,
    private logger: CustomLogger,
  ) {}

  async startShift(userId: string) {
    try {
      const nozzles = await this.prisma.nozzle.findMany({
        include: { tank: { include: { product: true } } },
      });

      if (nozzles.length === 0) {
        this.logger.warn(
          `Shift start failed: No nozzles configured`,
          'ShiftsService',
          userId,
        );
        throw new BadRequestException(
          'Cannot start shift. No nozzles are configured in the system.',
        );
      }

      const openShift = await this.prisma.shift.findFirst({
        where: { status: ShiftStatus.OPEN },
      });

      if (openShift) {
        this.logger.warn(
          `Shift start failed: Shift already open`,
          'ShiftsService',
          userId,
        );
        throw new BadRequestException('A shift is already open.');
      }

      const readingsData = nozzles.map((n) => ({
        nozzle: n.name,
        reading: Number(n.lastReading),
        product: n.tank.product.name,
      }));

      const shift = await this.prisma.shift.create({
        data: {
          openerId: userId,
          status: ShiftStatus.OPEN,
          startReadings: JSON.stringify(readingsData),
        },
        include: { opener: true },
      });

      for (const nozzle of nozzles) {
        await this.prisma.nozzleReading.create({
          data: {
            shiftId: shift.id,
            nozzleId: nozzle.id,
            openingReading: nozzle.lastReading,
          },
        });
      }

      this.logger.logBusinessOperation(
        'SHIFT_START',
        `Shift ${shift.id} opened by ${shift.opener.username}`,
        userId,
        true,
      );

      try {
        const prefs = await this.prisma.notificationPreferences.findFirst();
        if (prefs?.shiftNotifications) {
          let msg = `🚀 *Shift Started* 🚀\nBy: ${shift.opener.username}\n\n*Opening Readings:*\n`;
          readingsData.forEach((r) => {
            msg += `${r.nozzle} (${r.product}): ${r.reading}L\n`;
          });
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
          msg += `\nOn: ${dateStr} ${timeStr}`;
          this.whatsappService
            .sendMessage(prefs.phoneNumber, msg)
            .catch(() => {});
        }
      } catch (err) {
        this.logger.error(
          'Failed to send shift start notification',
          (err as Error).message,
          'ShiftsService',
        );
      }

      return shift;
    } catch (error: any) {
      this.logger.error(
        `Shift start failed`,
        error.message,
        'ShiftsService',
        userId,
      );
      throw error;
    }
  }

  async getCurrentShift() {
    return this.prisma.shift.findFirst({
      where: { status: ShiftStatus.OPEN },
      include: {
        readings: {
          include: {
            nozzle: { include: { tank: { include: { product: true } } } },
          },
        },
        opener: true,
      },
    });
  }

  async hasOpenShift(): Promise<boolean> {
    const count = await this.prisma.shift.count({
      where: { status: ShiftStatus.OPEN },
    });
    return count > 0;
  }

  async closeShift(
    userId: string,
    readings: { nozzleId: string; closingReading: number }[],
  ) {
    try {
      const shift = await this.getCurrentShift();
      if (!shift) {
        this.logger.warn(
          `Shift close failed: No open shift`,
          'ShiftsService',
          userId,
        );
        throw new BadRequestException('No open shift found.');
      }

      const readingsData: Array<{
        nozzle: string;
        opening: number;
        closing: number;
        sold: number;
        product: string;
      }> = [];

      for (const reading of readings) {
        const nozzleReading = shift.readings.find(
          (r) => r.nozzleId === reading.nozzleId,
        );
        if (!nozzleReading) {
          continue;
        }

        if (reading.closingReading < Number(nozzleReading.openingReading)) {
          this.logger.warn(
            `Invalid closing reading for nozzle ${nozzleReading.nozzle.name}`,
            'ShiftsService',
            userId,
          );
          throw new BadRequestException(
            `Closing reading cannot be less than opening reading for nozzle ${nozzleReading.nozzle.name}`,
          );
        }

        await this.prisma.nozzle.update({
          where: { id: reading.nozzleId },
          data: { lastReading: reading.closingReading },
        });

        await this.prisma.nozzleReading.update({
          where: { id: nozzleReading.id },
          data: { closingReading: reading.closingReading },
        });

        const nozzle = await this.prisma.nozzle.findUnique({
          where: { id: reading.nozzleId },
          include: { tank: { include: { product: true } } },
        });

        if (nozzle) {
          readingsData.push({
            nozzle: nozzle.name,
            opening: Number(nozzleReading.openingReading),
            closing: reading.closingReading,
            sold: reading.closingReading - Number(nozzleReading.openingReading),
            product: nozzle.tank.product.name,
          });
        }
      }

      const closer = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const updatedShift = await this.prisma.shift.update({
        where: { id: shift.id },
        data: {
          status: ShiftStatus.CLOSED,
          closerId: userId,
          endTime: new Date(),
          endReadings: JSON.stringify(readingsData),
        },
      });

      this.logger.logBusinessOperation(
        'SHIFT_CLOSE',
        `Shift ${shift.id} closed`,
        userId,
        true,
      );

      try {
        const prefs = await this.prisma.notificationPreferences.findFirst();
        if (prefs?.shiftNotifications && closer) {
          const summary = await this.reportsService.getDailySaleSummary(
            updatedShift.id,
          );
          let msg = `🏁 *Shift Closed* 🏁\nBy: ${closer.username}\n\n*Closing Readings:*\n`;
          readingsData.forEach((r) => {
            msg += `${r.nozzle} (${r.product}):\n  Opening: ${r.opening}L\n  Closing: ${r.closing}L\n  Sold: ${r.sold}L\n\n`;
          });
          msg += `*Sales Summary:*\nTotal: Rs. ${summary.totalSales}\nCash: Rs. ${summary.cashSales}\nCredit: Rs. ${summary.creditSales}`;
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
          msg += `\n\nOn: ${dateStr} ${timeStr}`;
          this.whatsappService
            .sendMessage(prefs.phoneNumber, msg)
            .catch(() => {});
        }
      } catch (err) {
        this.logger.error(
          'Failed to send shift closure notification',
          (err as Error).message,
          'ShiftsService',
        );
      }

      return updatedShift;
    } catch (error: any) {
      this.logger.error(
        `Shift close failed`,
        error.message,
        'ShiftsService',
        userId,
      );
      throw error;
    }
  }

  async getAutoCloseStatus() {
    const prefs = await this.prisma.notificationPreferences.findFirst();
    return { enabled: prefs?.autoCloseShift || false };
  }

  async toggleAutoClose(enabled: boolean) {
    const prefs = await this.prisma.notificationPreferences.findFirst();
    if (!prefs) {
      throw new BadRequestException('Notification preferences not configured');
    }
    await this.prisma.notificationPreferences.update({
      where: { id: prefs.id },
      data: { autoCloseShift: enabled },
    });
    return { enabled };
  }

  @Cron('0 0 0,12 * * *')
  async autoCloseAndStartShift() {
    try {
      const prefs = await this.prisma.notificationPreferences.findFirst();
      if (!prefs?.autoCloseShift) {
        return;
      }

      const openShift = await this.getCurrentShift();

      // If no shift is open, start a new one
      if (!openShift) {
        this.logger.log(
          'No open shift found. Starting new shift automatically.',
          'ShiftsService',
        );
        const users = await this.prisma.user.findMany({ take: 1 });
        if (users.length > 0) {
          await this.startShift(users[0].id);
          this.logger.log('Auto-started new shift at 12:00', 'ShiftsService');
        }
        return;
      }

      // Close existing shift with current readings
      const readings = openShift.readings.map((r) => ({
        nozzleId: r.nozzleId,
        closingReading: Number(r.nozzle.lastReading),
      }));

      const systemUserId = openShift.openerId;
      await this.closeShift(systemUserId, readings);
      this.logger.log('Auto-closed shift at 12:00', 'ShiftsService');

      await new Promise((resolve) => setTimeout(resolve, 2000));

      await this.startShift(systemUserId);
      this.logger.log('Auto-started new shift at 12:00', 'ShiftsService');
    } catch (err) {
      this.logger.error(
        'Auto shift management failed',
        (err as Error).message,
        'ShiftsService',
      );
    }
  }
  async findAll(limit: number = 50) {
    return this.prisma.shift.findMany({
      take: limit,
      orderBy: { startTime: 'desc' },
      include: {
        opener: { select: { username: true } },
        closer: { select: { username: true } },
      },
    });
  }
}
