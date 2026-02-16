import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLogger } from '../logger/custom-logger.service';
import { ShiftStatus } from '@prisma/client';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ReportsService } from '../reports/reports.service';

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

      const shift = await this.prisma.shift.create({
        data: {
          openerId: userId,
          status: ShiftStatus.OPEN,
        },
        include: { opener: true },
      });

      const nozzles = await this.prisma.nozzle.findMany();

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
      include: { readings: { include: { nozzle: true } }, opener: true },
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
      }

      const updatedShift = await this.prisma.shift.update({
        where: { id: shift.id },
        data: {
          status: ShiftStatus.CLOSED,
          closerId: userId,
          endTime: new Date(),
        },
      });

      this.logger.logBusinessOperation(
        'SHIFT_CLOSE',
        `Shift ${shift.id} closed`,
        userId,
        true,
      );

      try {
        const summary = await this.reportsService.getDailySaleSummary(
          updatedShift.id,
        );
        this.whatsappService
          .notifyShiftEnd('923000000000', summary)
          .catch(() => {});
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
}
