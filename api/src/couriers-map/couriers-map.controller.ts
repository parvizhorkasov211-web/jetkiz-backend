
import { Controller, Get, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CouriersMapService } from './couriers-map.service';

@Controller('couriers')
@UseGuards(JwtAuthGuard)
export class CouriersMapController {
  constructor(private readonly mapService: CouriersMapService) {}

  @Get('map')
  async getMap(@Req() req: any) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin');
    }

    return this.mapService.getMapPoints();
  }
}