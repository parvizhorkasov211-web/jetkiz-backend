import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  titleRu?: string;

  @IsOptional()
  @IsString()
  titleKk?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsString()
  weight?: string | null;

  @IsOptional()
  @IsString()
  composition?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isDrink?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}