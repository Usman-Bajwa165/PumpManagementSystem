import { IsString, IsNumber, Min, IsUUID } from 'class-validator';

export class CreateNozzleDto {
  @IsString()
  name: string;

  @IsUUID()
  tankId: string;

  @IsNumber()
  @Min(0)
  lastReading: number;
}
