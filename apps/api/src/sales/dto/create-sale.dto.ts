import { IsString, IsNumber, Min, IsOptional, IsUUID } from 'class-validator';

export class CreateSaleDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional() // Could be cash or credit customer
  customerName?: string;

  @IsString() // 'CASH' | 'CREDIT'
  paymentMethod: string;
}
