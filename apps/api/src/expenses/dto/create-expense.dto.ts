import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  category: string; // "Utility", "Wages", "Food", etc.

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  date?: Date;

  @IsEnum(['CASH', 'CARD', 'ONLINE'])
  @IsOptional()
  paymentMethod?: 'CASH' | 'CARD' | 'ONLINE';

  @IsString()
  @IsOptional()
  paymentAccountId?: string;
}
