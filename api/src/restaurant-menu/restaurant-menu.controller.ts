import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { RestaurantMenuService } from './restaurant-menu.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

function ensureDir(dir: string) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function safeFileName(original: string) {
  const e = extname(original || '').toLowerCase();
  const ext = e && e.length <= 10 ? e : '.jpg';
  const base = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${base}${ext}`;
}

const productsUploadsDir = join(process.cwd(), 'uploads', 'products');
ensureDir(productsUploadsDir);

const productMulter = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir(productsUploadsDir);
      cb(null, productsUploadsDir);
    },
    filename: (_req, file, cb) => {
      cb(null, safeFileName(file.originalname));
    },
  }),
  limits: {
    files: 11, // 1 main + 10 others
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};

@Controller('restaurants')
export class RestaurantMenuController {
  constructor(private readonly service: RestaurantMenuService) {}

  // GET /restaurants/:id/menu?includeUnavailable=1
  @Get(':id/menu')
  async getMenu(
    @Param('id') restaurantId: string,
    @Query('includeUnavailable') includeUnavailable?: string,
  ) {
    const flag = includeUnavailable === '1' || includeUnavailable === 'true';
    return this.service.getRestaurantMenu({
      restaurantId,
      includeUnavailable: flag,
    });
  }

  // POST /restaurants/:id/menu/products
  @Post(':id/menu/products')
  async createProduct(
    @Param('id') restaurantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.service.createProduct({
      restaurantId,
      ...dto,
    });
  }

  // PATCH /restaurants/:id/menu/products/:productId
  @Patch(':id/menu/products/:productId')
  async updateProduct(
    @Param('id') restaurantId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.updateProduct({
      restaurantId,
      productId,
      dto,
    });
  }

  // REPLACE: POST /restaurants/:id/menu/products/:productId/images
  // multipart/form-data:
  // main: File (max 1)
  // others: File[] (max 10)
  @Post(':id/menu/products/:productId/images')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'main', maxCount: 1 },
        { name: 'others', maxCount: 10 },
      ],
      productMulter as any,
    ),
  )
  async uploadProductImages(
    @Param('id') restaurantId: string,
    @Param('productId') productId: string,
    @UploadedFiles()
    files: {
      main?: Express.Multer.File[];
      others?: Express.Multer.File[];
    },
  ) {
    const main = files?.main?.[0] || null;
    const others = files?.others || [];

    return this.service.setProductImages({
      restaurantId,
      productId,
      mainFile: main,
      otherFiles: others,
    });
  }

  // ADD: POST /restaurants/:id/menu/products/:productId/images/add
  // multipart/form-data:
  // files: File[] (max 10)
  @Post(':id/menu/products/:productId/images/add')
  @UseInterceptors(FilesInterceptor('files', 10, productMulter as any))
  async addProductImages(
    @Param('id') restaurantId: string,
    @Param('productId') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.addProductImages({
      restaurantId,
      productId,
      files: files || [],
    });
  }

  // SET MAIN: PATCH /restaurants/:id/menu/products/:productId/images/:imageId/main
  @Patch(':id/menu/products/:productId/images/:imageId/main')
  async setMain(
    @Param('id') restaurantId: string,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.service.setMainProductImage({
      restaurantId,
      productId,
      imageId,
    });
  }

  // DELETE IMAGE: DELETE /restaurants/:id/menu/products/:productId/images/:imageId
  @Delete(':id/menu/products/:productId/images/:imageId')
  async deleteImage(
    @Param('id') restaurantId: string,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.service.deleteProductImage({
      restaurantId,
      productId,
      imageId,
    });
  }

  // DELETE /restaurants/:id/menu/products/:productId
  @Delete(':id/menu/products/:productId')
  async deleteProduct(
    @Param('id') restaurantId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.deleteProduct({
      restaurantId,
      productId,
    });
  }
}