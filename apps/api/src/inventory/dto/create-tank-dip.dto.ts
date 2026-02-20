import { IsUUID, IsNumber, Min } from 'class-validator';

export class CreateTankDipDto {
  @IsUUID()
  tankId: string;

  @IsNumber()
  @Min(0)
  dipReading: number; // Volume in Liters

  @IsNumber()
  @Min(0)
  loss?: number; // Manual loss in Liters
}
