import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientReviewsController } from './client-reviews.controller';
import { ClientReviewsService } from './client-reviews.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClientReviewsController],
  providers: [ClientReviewsService],
  exports: [ClientReviewsService],
})
export class ClientReviewsModule {}
