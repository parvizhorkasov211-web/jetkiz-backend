import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCourierProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @IsOptional()
  @IsString()
  // ИИН 12 цифр
  @Matches(/^\d{12}$/, { message: 'iin must be 12 digits' })
  iin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  // legacy fixed override (работает только когда погода выключена)
  @IsOptional()
  @IsInt()
  @Min(0)
  personalFeeOverride?: number | null;

  // ✅ мотивация (надбавка), всегда прибавляется к базе/погоде
  @IsOptional()
  @IsInt()
  @Min(0)
  payoutBonusAdd?: number | null;
}