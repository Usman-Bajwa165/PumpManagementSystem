import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsNumber()
  @IsOptional()
  balance?: number; // Initial balance/debt
}
