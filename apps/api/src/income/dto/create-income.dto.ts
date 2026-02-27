import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class CreateIncomeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: Date;

  @IsString()
  @IsOptional()
  paymentMethod?: 'CASH' | 'CARD' | 'ONLINE';

  @IsString()
  @IsOptional()
  paymentAccountId?: string;
}
