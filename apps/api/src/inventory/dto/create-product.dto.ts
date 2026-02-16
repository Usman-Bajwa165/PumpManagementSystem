import { IsString, IsNumber, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsNumber()
  @Min(0)
  purchasePrice: number;
}
