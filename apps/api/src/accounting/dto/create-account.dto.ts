import { IsString, IsEnum, IsNumber, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Account code must be exactly 5 digits' })
  code: string;

  @IsString()
  @MinLength(3, { message: 'Account name must be at least 3 characters' })
  @MaxLength(100, { message: 'Account name cannot exceed 100 characters' })
  name: string;

  @IsEnum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'], {
    message: 'Type must be ASSET, LIABILITY, EQUITY, INCOME, or EXPENSE',
  })
  type: string;

  @IsNumber()
  @IsOptional()
  balance?: number;
}
