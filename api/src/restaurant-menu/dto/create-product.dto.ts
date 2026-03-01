import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  titleRu!: string;

  @IsString()
  @IsNotEmpty()
  titleKk!: string;

  @IsInt()
  @Min(1)
  price!: number;

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
}