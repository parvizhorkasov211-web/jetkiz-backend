import { IsInt, IsString, Min } from 'class-validator';

export class ValidatePromoCodeDto {
  @IsString()
  code!: string;

  @IsString()
  userId!: string;

  @IsString()
  restaurantId!: string;

  @IsInt()
  @Min(0)
  subtotal!: number;

  @IsInt()
  @Min(0)
  deliveryFee!: number;
}