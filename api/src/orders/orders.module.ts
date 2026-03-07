import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule, PromoCodesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}