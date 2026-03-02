import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateCourierDto {
  @IsString()
  @IsNotEmpty()
  // +7XXXXXXXXXX (Казахстан/РФ формат для старта)
  @Matches(/^\+\d{10,15}$/, { message: 'phone must be like +7XXXXXXXXXX' })
  phone!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  // ИИН 12 цифр
  @Matches(/^\d{12}$/, { message: 'iin must be 12 digits' })
  iin!: string;
}