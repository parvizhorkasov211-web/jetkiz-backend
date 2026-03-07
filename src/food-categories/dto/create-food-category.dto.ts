import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFoodCategoryDto {
  @IsString()
  restaurantId!: string;

  @IsString()
  titleRu!: string;

  @IsOptional()
  @IsString()
  titleKk?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}