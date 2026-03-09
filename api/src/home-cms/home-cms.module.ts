import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HomeCmsController } from './home-cms.controller';
import { HomeCmsService } from './home-cms.service';

@Module({
  imports: [PrismaModule],
  controllers: [HomeCmsController],
  providers: [HomeCmsService],
  exports: [HomeCmsService],
})
export class HomeCmsModule {}