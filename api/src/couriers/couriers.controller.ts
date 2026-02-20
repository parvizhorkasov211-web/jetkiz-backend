// api/src/couriers/couriers.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CouriersService } from './couriers.service';

function toInt(v: any, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

@Controller('couriers')
@UseGuards(JwtAuthGuard)
export class CouriersController {
  constructor(private readonly couriers: CouriersService) {}

  // GET /couriers?page&limit&q&online
  @Get()
  list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('online') online?: string,
  ) {
    const onlineBool =
      online === 'true' ? true : online === 'false' ? false : undefined;

    return this.couriers.list(req.user, {
      q,
      page: toInt(page, 1),
      limit: toInt(limit, 20),
      online: onlineBool,
    });
  }

  // GET /couriers/:id
  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.couriers.getOne(req.user, id);
  }

  // PATCH /couriers/:id/online  { isOnline: boolean, source?: string, reason?: string }
  @Patch(':id/online')
  setOnline(
    @Req() req: any,
    @Param('id') id: string,
    @Body('isOnline') isOnline: boolean,
    @Body('source') source?: string,
    @Body('reason') reason?: string,
  ) {
    return this.couriers.setOnline(req.user, id, Boolean(isOnline), {
      source,
      reason,
    });
  }

  // PATCH /couriers/:id/active  { isActive: boolean }
  @Patch(':id/active')
  setActive(
    @Req() req: any,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.couriers.setActive(req.user, id, Boolean(isActive));
  }
}
