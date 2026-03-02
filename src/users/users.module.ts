import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerMetricsService } from './customer-metrics.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, CustomerMetricsService],
  exports: [UsersService],
})
export class UsersModule {}
