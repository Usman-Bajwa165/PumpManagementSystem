import { IsString, IsNumber, Min, IsUUID } from 'class-validator';

export class CreateTankDto {
  @IsString()
  name: string;

  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(0)
  capacity: number;

  @IsNumber()
  @Min(0)
  currentStock: number;
}
