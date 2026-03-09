import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

function restaurantCoverStorage() {
  return diskStorage({
    destination: join(process.cwd(), 'uploads', 'restaurants'),
    filename: (_req, file, cb) => {
      const safeExt = extname(file.originalname || '').toLowerCase() || '.jpg';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      cb(null, unique);
    },
  });
}

function imageFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  const mime = file.mimetype?.toLowerCase() || '';
  if (
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/png' ||
    mime === 'image/webp'
  ) {
    return cb(null, true);
  }
  cb(new BadRequestException('Only jpg, jpeg, png, webp are allowed') as any, false);
}

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get('finance/config')
  getFinanceConfig() {
    return this.restaurants.getFinanceConfig();
  }

  @Patch('finance/config')
  updateFinanceConfig(
    @Body()
    body: {
      clientDeliveryFeeDefault?: number;
      clientDeliveryFeeWeather?: number;
      courierPayoutDefault?: number;
      courierPayoutWeather?: number;
      courierCommissionPctDefault?: number;
      restaurantCommissionPctDefault?: number;
      weatherEnabled?: boolean;
    },
  ) {
    return this.restaurants.updateFinanceConfig(body);
  }

  @Get('commission/default')
  getRestaurantCommissionDefault() {
    return this.restaurants.getRestaurantCommissionDefault();
  }

  @Patch('commission/default')
  setRestaurantCommissionDefault(
    @Body() body: { restaurantCommissionPctDefault?: number },
  ) {
    return this.restaurants.setRestaurantCommissionDefault(
      body?.restaurantCommissionPctDefault,
    );
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('status') status?: 'OPEN' | 'CLOSED',
  ) {
    return this.restaurants.findAll(q, status);
  }

  /**
   * Главная страница: только рестораны, отмеченные для показа на главной
   */
  @Get('public/list')
  list(@Query('random') random?: string) {
    return this.restaurants.list({
      random: random === '1' || random === 'true',
    });
  }

  /**
   * Полный список для раздела "Рестораны":
   * все открытые рестораны, доступные в приложении
   */
  @Get('public/all')
  publicAll(@Query('random') random?: string) {
    return this.restaurants.publicAll({
      random: random === '1' || random === 'true',
    });
  }

  @Get(':id/menu')
  menu(
    @Param('id') restaurantId: string,
    @Query('includeUnavailable') includeUnavailable?: string,
  ) {
    return this.restaurants.products(restaurantId, {
      includeUnavailable:
        includeUnavailable === '1' || includeUnavailable === 'true',
    });
  }

  @Get(':id/products')
  products(
    @Param('id') restaurantId: string,
    @Query('includeUnavailable') includeUnavailable?: string,
  ) {
    return this.restaurants.products(restaurantId, {
      includeUnavailable:
        includeUnavailable === '1' || includeUnavailable === 'true',
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.restaurants.getOne(id);
  }

  @Post()
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurants.create(dto);
  }

  @Post(':id/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: restaurantCoverStorage(),
      fileFilter: imageFileFilter,
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const coverImageUrl = `/uploads/restaurants/${file.filename}`;
    return this.restaurants.setCoverImage(id, coverImageUrl);
  }

  @Patch(':id/in-app')
  setInApp(
    @Param('id') id: string,
    @Body() body: { isInApp?: boolean },
  ) {
    return this.restaurants.setInApp(id, body?.isInApp);
  }

  /**
   * Показывать ресторан на главной
   * Не влияет на раздел "Рестораны"
   */
  @Patch(':id/pinned')
  setPinned(
    @Param('id') id: string,
    @Body() body: { isPinned?: boolean; sortOrder?: number },
  ) {
    return this.restaurants.setPinned(
      id,
      body?.isPinned,
      body?.sortOrder,
    );
  }

  @Patch(':id/commission')
  setRestaurantCommissionOverride(
    @Param('id') id: string,
    @Body() body: { restaurantCommissionPctOverride?: number | null },
  ) {
    return this.restaurants.setRestaurantCommissionOverride(
      id,
      body?.restaurantCommissionPctOverride,
    );
  }

  @Post(':id/commission/reset')
  resetRestaurantCommissionOverride(@Param('id') id: string) {
    return this.restaurants.resetRestaurantCommissionOverride(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restaurants.remove(id);
  }
}