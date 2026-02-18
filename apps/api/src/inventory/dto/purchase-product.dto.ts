import {
  IsString,
  IsNumber,
  Min,
  IsUUID,
  IsOptional,
  IsIn,
} from 'class-validator';

export class PurchaseProductDto {
  @IsString()
  tankId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  cost: number; // Total Cost

  @IsString()
  @IsOptional()
  supplierId?: string; // Optional for now to avoid breaking legacy? No, make it required for strict mode. Actually optional for "Cash Purchase" from unknown? Best to require a "Walk-in" supplier if needed. Let's make it optional but recommended.

  @IsString()
  @IsOptional()
  @IsIn(['PAID', 'UNPAID', 'PARTIAL'])
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';

  @IsNumber()
  @IsOptional()
  paidAmount?: number;
}
