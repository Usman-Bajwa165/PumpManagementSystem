import { IsString, IsNumber, Min, IsOptional, IsUUID } from 'class-validator';

export class CreateSaleDto {
  @IsUUID()
  nozzleId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsString()
  @IsOptional()
  paymentAccountId?: string;

  @IsString() // 'CASH' | 'CARD' | 'ONLINE' | 'CREDIT'
  paymentMethod: string;
}
