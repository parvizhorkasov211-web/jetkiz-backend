import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RestaurantStatus } from '@prisma/client';

export class CreateRestaurantDto {
  @IsString()
  @MinLength(1)
  nameRu!: string;

  @IsString()
  @MinLength(1)
  nameKk!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  workingHours?: string;

  @IsOptional()
  @IsEnum(RestaurantStatus)
  status?: RestaurantStatus;
}