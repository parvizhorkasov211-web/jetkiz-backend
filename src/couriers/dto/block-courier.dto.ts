import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockCourierDto {
  @IsBoolean()
  blocked!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}