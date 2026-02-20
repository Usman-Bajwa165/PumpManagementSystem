import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsEnum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'])
  @IsOptional()
  type?: string;
}
