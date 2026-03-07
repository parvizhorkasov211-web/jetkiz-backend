import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';

type JwtUser = {
  id: string;
  role?: 'CLIENT' | 'ADMIN' | 'COURIER' | 'RESTAURANT';
};

@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodes: PromoCodesService) {}

  private ensureAdmin(user: JwtUser) {
    if ((user.role ?? 'CLIENT') !== 'ADMIN') {
      throw new ForbiddenException('Only admin');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreatePromoCodeDto) {
    this.ensureAdmin(user);
    return this.promoCodes.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: JwtUser) {
    this.ensureAdmin(user);
    return this.promoCodes.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle')
  toggle(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    this.ensureAdmin(user);
    return this.promoCodes.toggle(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  validate(@Body() dto: ValidatePromoCodeDto) {
    return this.promoCodes.validate(dto);
  }
}