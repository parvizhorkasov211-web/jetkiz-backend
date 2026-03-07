import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateFoodCategoryDto {
  @IsOptional()
  @IsString()
  titleRu?: string;

  @IsOptional()
  @IsString()
  titleKk?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}