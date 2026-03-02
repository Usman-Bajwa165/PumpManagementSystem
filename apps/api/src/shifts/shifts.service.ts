import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLogger } from '../logger/custom-logger.service';
import { ShiftStatus } from '@prisma/client';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ReportsService } from '../reports/reports.service';
import { BackupService } from '../backup/backup.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ShiftsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService,
    private reportsService: ReportsService,
    private backupService: BackupService,
    private logger: CustomLogger,
  ) {}

  async onModuleInit() {
    // Wait for a short period to ensure all other services are fully initialized
    setTimeout(() => {
      this.checkAndRunMissedShiftManagement().catch((err) => {
        this.logger.error(
          'Startup shift check failed',
          err.message,
          'ShiftsService',
        );
      });
    }, 12000);
  }

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
        (error as Error).message,
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
          msg += `*Sales Summary:*\nTotal: Rs. ${summary.totalSales}\nCash: Rs. ${summary.cashSales}\nCard: Rs. ${summary.cardSales}\nOnline: Rs. ${summary.onlineSales}\nCredit: Rs. ${summary.creditSales}`;
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

        if (prefs?.backupOnShiftClose) {
          const now = new Date();
          const hours = now.getHours();
          const period = hours >= 12 ? 'D' : 'N';
          await this.backupService.performBackup(period as 'D' | 'N');
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
        (error as Error).message,
        'ShiftsService',
        userId,
      );
      throw error;
    }
  }

  async getAutoCloseStatus() {
    const prefs = await this.prisma.notificationPreferences.findFirst();
    return {
      enabled: prefs?.autoCloseShift || false,
      startTime: prefs?.autoShiftStartTime || '00:00',
      endTime: prefs?.autoShiftEndTime || '12:00',
    };
  }

  async toggleAutoClose(
    enabled: boolean,
    startTime?: string,
    endTime?: string,
  ) {
    const prefs = await this.prisma.notificationPreferences.findFirst();
    if (!prefs) {
      throw new BadRequestException('Notification preferences not configured');
    }

    const normalizedStart = (startTime || prefs.autoShiftStartTime || '00:00')
      .slice(0, 5)
      .padStart(5, '0');
    const normalizedEnd = (endTime || prefs.autoShiftEndTime || '12:00')
      .slice(0, 5)
      .padStart(5, '0');

    await this.prisma.notificationPreferences.update({
      where: { id: prefs.id },
      data: {
        autoCloseShift: enabled,
        autoShiftStartTime: normalizedStart,
        autoShiftEndTime: normalizedEnd,
      },
    });
    return {
      enabled,
      startTime: normalizedStart,
      endTime: normalizedEnd,
    };
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

  // --- Weekly Schedule Management ---

  async getSchedules() {
    return this.prisma.shiftSchedule.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async addSchedule(data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) {
    if (data.dayOfWeek < 0 || data.dayOfWeek > 6) {
      throw new BadRequestException('Invalid day of week (0-6)');
    }

    const allSchedules = await this.prisma.shiftSchedule.findMany({
      where: { enabled: true },
    });

    for (const schedule of allSchedules) {
      if (this.doSchedulesOverlap(data, schedule)) {
        throw new BadRequestException(
          `Schedule overlaps with existing one on ${this.getDayName(schedule.dayOfWeek)} (${schedule.startTime} - ${schedule.endTime})`,
        );
      }
    }

    return this.prisma.shiftSchedule.create({
      data: { ...data, enabled: true },
    });
  }

  async deleteSchedule(id: string) {
    return this.prisma.shiftSchedule.delete({ where: { id } });
  }

  async toggleSchedule(id: string, enabled: boolean) {
    return this.prisma.shiftSchedule.update({
      where: { id },
      data: { enabled },
    });
  }

  private doSchedulesOverlap(
    s1: { dayOfWeek: number; startTime: string; endTime: string },
    s2: { dayOfWeek: number; startTime: string; endTime: string },
  ): boolean {
    const toWeekMinutes = (day: number, time: string) => {
      const [h, m] = time.split(':').map(Number);
      return day * 24 * 60 + h * 60 + m;
    };

    const start1 = toWeekMinutes(s1.dayOfWeek, s1.startTime);
    let end1 = toWeekMinutes(s1.dayOfWeek, s1.endTime);
    if (this.timeToMinutes(s1.endTime) <= this.timeToMinutes(s1.startTime)) {
      end1 += 24 * 60;
    }

    const start2 = toWeekMinutes(s2.dayOfWeek, s2.startTime);
    let end2 = toWeekMinutes(s2.dayOfWeek, s2.endTime);
    if (this.timeToMinutes(s2.endTime) <= this.timeToMinutes(s2.startTime)) {
      end2 += 24 * 60;
    }

    // Check for overlap in a circular week (10080 minutes)
    const segments1 = this.getWeekSegments(start1, end1);
    const segments2 = this.getWeekSegments(start2, end2);

    for (const seg1 of segments1) {
      for (const seg2 of segments2) {
        if (seg1.start < seg2.end && seg2.start < seg1.end) return true;
      }
    }
    return false;
  }

  private getWeekSegments(
    start: number,
    end: number,
  ): { start: number; end: number }[] {
    const week = 7 * 24 * 60;
    const s = start % week;
    const e = end % week;

    if (end - start >= week) return [{ start: 0, end: week }];
    if (e < s) {
      return [
        { start: s, end: week },
        { start: 0, end: e },
      ];
    }
    return [{ start: s, end: e }];
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  // --- Updated Auto-Closure Logic ---

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCloseAndStartShift() {
    try {
      const prefs = await this.prisma.notificationPreferences.findFirst();
      const weeklySchedules = await this.prisma.shiftSchedule.findMany({
        where: { enabled: true },
      });

      const now = new Date();
      const timeString = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Karachi',
      });
      const dayOfWeek = now.getDay();

      let triggerFound = false;
      if (prefs?.autoCloseShift) {
        if (
          timeString === prefs.autoShiftStartTime ||
          timeString === prefs.autoShiftEndTime
        ) {
          triggerFound = true;
        }
      }

      if (!triggerFound) {
        // Check today's schedules
        const todaySchedules = weeklySchedules.filter(
          (s) => s.dayOfWeek === dayOfWeek,
        );
        for (const s of todaySchedules) {
          if (timeString === s.startTime || timeString === s.endTime) {
            triggerFound = true;
            break;
          }
        }

        // Check if we are at the end of a shift that started yesterday and crossed midnight
        if (!triggerFound) {
          const yesterday = (dayOfWeek + 6) % 7;
          const yesterdaySchedules = weeklySchedules.filter(
            (s) => s.dayOfWeek === yesterday,
          );
          for (const s of yesterdaySchedules) {
            const isCrossMidnight =
              this.timeToMinutes(s.endTime) <= this.timeToMinutes(s.startTime);
            if (isCrossMidnight && timeString === s.endTime) {
              triggerFound = true;
              break;
            }
          }
        }
      }

      if (!triggerFound) return;

      const openShift = await this.getCurrentShift();

      if (!openShift) {
        this.logger.log(
          'Triggered rotation: No open shift. Starting new.',
          'ShiftsService',
        );
        const users = await this.prisma.user.findMany({ take: 1 });
        if (users.length > 0) await this.startShift(users[0].id);
        return;
      }

      this.logger.log(
        `Triggered rotation for shift ${openShift.id}`,
        'ShiftsService',
      );
      const readings = openShift.readings.map((r) => ({
        nozzleId: r.nozzleId,
        closingReading: Number(r.nozzle.lastReading),
      }));

      await this.closeShift(openShift.openerId, readings);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await this.startShift(openShift.openerId);
    } catch (err) {
      this.logger.error(
        'Auto shift management failed',
        (err as Error).message,
        'ShiftsService',
      );
    }
  }

  async checkAndRunMissedShiftManagement() {
    try {
      this.logger.log(
        'Startup: Checking for missed rotations...',
        'ShiftsService',
      );
      const prefs = await this.prisma.notificationPreferences.findFirst();
      const weeklySchedules = await this.prisma.shiftSchedule.findMany({
        where: { enabled: true },
      });

      const openShift = await this.getCurrentShift();
      if (!openShift) return;

      const now = new Date();
      const shiftStart = new Date(openShift.startTime);
      const rotationPoints: Date[] = [];

      if (prefs?.autoCloseShift) {
        rotationPoints.push(
          this.getNextRotationTimeFromPoint(
            shiftStart,
            prefs.autoShiftStartTime || '00:00',
          ),
          this.getNextRotationTimeFromPoint(
            shiftStart,
            prefs.autoShiftEndTime || '12:00',
          ),
        );
      }

      // Check weekly schedules for EVERY day between shiftStart and now
      const checkDate = new Date(shiftStart);
      // Reset seconds/ms for comparison
      checkDate.setSeconds(0, 0);
      const limit = new Date(now);
      limit.setSeconds(0, 0);

      while (checkDate <= limit) {
        const currentCheckDay = checkDate.getDay();
        const schedules = weeklySchedules.filter(
          (s) => s.dayOfWeek === currentCheckDay,
        );

        for (const s of schedules) {
          const startP = this.getSpecificTimeOnDate(checkDate, s.startTime);
          const endP = this.getSpecificTimeOnDate(checkDate, s.endTime);

          if (startP > shiftStart && startP < now) rotationPoints.push(startP);

          // For endTime, it might be on the next day if it crosses midnight
          const actualEndP = new Date(endP);
          if (
            this.timeToMinutes(s.endTime) <= this.timeToMinutes(s.startTime)
          ) {
            actualEndP.setDate(actualEndP.getDate() + 1);
          }
          if (actualEndP > shiftStart && actualEndP < now)
            rotationPoints.push(actualEndP);
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }

      rotationPoints.sort((a, b) => a.getTime() - b.getTime());
      if (rotationPoints.some((p) => p > shiftStart && p < now)) {
        this.logger.log(
          `Missed rotations detected for shift ${openShift.id}. Rotating.`,
          'ShiftsService',
        );
        const readings = openShift.readings.map((r) => ({
          nozzleId: r.nozzleId,
          closingReading: Number(r.nozzle.lastReading),
        }));
        await this.closeShift(openShift.openerId, readings);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await this.startShift(openShift.openerId);
      }
    } catch (error) {
      this.logger.error(
        'Startup shift check failed',
        error instanceof Error ? error.message : 'Unknown',
        'ShiftsService',
      );
    }
  }

  private getNextRotationTimeFromPoint(point: Date, timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(point);
    d.setHours(h, m, 0, 0);
    if (d <= point) d.setDate(d.getDate() + 1);
    return d;
  }

  private getSpecificTimeOnDate(date: Date, timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }

  private getDayName(day: number): string {
    return [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ][day];
  }
}
