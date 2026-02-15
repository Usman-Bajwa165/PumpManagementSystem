import { IsString, IsNumber, Min, IsUUID } from 'class-validator';

export class PurchaseProductDto {
  @IsUUID()
  tankId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsString()
  supplier: string;
}
