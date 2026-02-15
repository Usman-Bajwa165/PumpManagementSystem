import { IsUUID, IsNumber, Min } from 'class-validator';

export class EndShiftDto {
  @IsUUID()
  shiftId: string;

  @IsNumber()
  @Min(0)
  closingReading: number;

  @IsUUID()
  nozzleId: string;
}
