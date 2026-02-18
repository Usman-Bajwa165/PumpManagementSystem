import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

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
}
