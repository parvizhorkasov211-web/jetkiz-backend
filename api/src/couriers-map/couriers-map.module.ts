import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CouriersMapController } from './couriers-map.controller';
import { CouriersMapService } from './couriers-map.service';

@Module({
  imports: [PrismaModule],
  controllers: [CouriersMapController],
  providers: [CouriersMapService],
})
export class CouriersMapModule {}