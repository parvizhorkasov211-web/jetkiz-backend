// api/src/couriers/couriers.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { CouriersService } from './couriers.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierProfileDto } from './dto/update-courier-profile.dto';
import { BlockCourierDto } from './dto/block-courier.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer?: any;
      }
    }
  }
}

function toInt(v: any, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function safeExt(originalName: string) {
  const e = extname(originalName || '').toLowerCase();
  if (e === '.jpg' || e === '.jpeg' || e === '.png' || e === '.webp') return e;
  return '.jpg';
}

@Controller('couriers')
@UseGuards(JwtAuthGuard)
export class CouriersController {
  constructor(private readonly couriers: CouriersService) {}

  // =========================
  // ✅ GLOBAL TARIFF (admin/public for admin ui)
  // =========================

  @Get('tariff/active')
  getActiveTariff(@Req() req: any) {
    return this.couriers.getActiveTariffPublic(req.user);
  }

  @Post('tariff')
  setGlobalTariff(@Req() req: any, @Body() body: any) {
    const fee = Number(body?.fee);
    if (!Number.isFinite(fee) || fee <= 0) {
      throw new BadRequestException('fee must be > 0');
    }
    return this.couriers.setGlobalTariff(req.user, { fee: Math.round(fee) });
  }

  // =========================
  // ✅ GLOBAL COMMISSION (admin)
  // =========================

  @Get('commission/default')
  getGlobalCommissionDefault(@Req() req: any) {
    return this.couriers.getGlobalCommissionDefault(req.user);
  }

  @Post('commission/default')
  setGlobalCommissionDefault(@Req() req: any, @Body() body: any) {
    const pct = Number(body?.pct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new BadRequestException('pct must be between 0 and 100');
    }
    return this.couriers.setGlobalCommissionDefault(req.user, { pct: Math.round(pct) });
  }

  // =========================
  // ✅ METRICS (admin)
  // =========================

  @Get('metrics/status-summary')
  getStatusSummary(@Req() req: any) {
    return this.couriers.getCourierStatusSummary(req.user);
  }

  @Get('metrics/online-timeline')
  getOnlineTimeline(@Req() req: any) {
    return this.couriers.getCourierOnlineTimeline(req.user);
  }

  @Get('metrics/online-series')
  getOnlineSeries(@Req() req: any) {
    return this.couriers.getCourierOnlineSeries(req.user);
  }

  // =========================
  // ✅ ME AVATAR (courier)
  // =========================

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/couriers',
        filename: (req, file, cb) => {
          const userId = req?.user?.id || 'unknown';
          const ext = safeExt(file.originalname);
          cb(null, `${userId}-${Date.now()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ok =
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/webp';
        cb(ok ? null : new Error('Only jpeg/png/webp'), ok);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadMyAvatar(@Req() req: any, @UploadedFile() file?: Express.Multer.File) {
    return this.couriers.uploadMyAvatar(req.user, file);
  }

  // =========================
  // ✅ LIST/CRUD (admin)
  // =========================

  @Get()
  getList(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('online') online?: string,
    @Query('active') active?: string,
  ) {
    return this.couriers.getCouriersAdmin(req.user, {
      page: toInt(page, 1),
      limit: toInt(limit, 20),
      q,
      online,
      active,
    });
  }

  @Post()
  createCourier(@Req() req: any, @Body() dto: CreateCourierDto) {
    return this.couriers.createCourier(req.user, dto);
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.couriers.getCourierAdminById(req.user, id);
  }

  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/couriers',
        filename: (req, file, cb) => {
          const userId = req?.params?.id || 'unknown';
          const ext = safeExt(file.originalname);
          cb(null, `${userId}-${Date.now()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ok =
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/webp';
        cb(ok ? null : new Error('Only jpeg/png/webp'), ok);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.couriers.uploadCourierAvatar(req.user, id, file);
  }

  @Patch(':id/profile')
  updateProfile(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCourierProfileDto,
  ) {
    return this.couriers.updateCourierProfile(req.user, id, dto);
  }

  @Patch(':id/blocked')
  blockCourier(@Req() req: any, @Param('id') id: string, @Body() dto: BlockCourierDto) {
    return this.couriers.blockCourier(req.user, id, dto);
  }

  @Patch(':id/online')
  setOnline(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.couriers.setCourierOnline(req.user, id, {
      isOnline: body?.isOnline,
      source: body?.source,
    });
  }

  @Post(':id/assign-order')
  assignOrder(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.couriers.assignOrderToCourier(req.user, id, body);
  }

  @Post(':id/unassign-order')
  unassignOrder(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.couriers.unassignOrderFromCourier(req.user, id, body);
  }

  // =========================
  // ✅ FINANCE (admin)
  // =========================

  @Get(':id/finance/summary')
  getFinanceSummary(
    @Req() req: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.couriers.getCourierFinanceSummary(req.user, id, { from, to });
  }

  @Get(':id/finance/ledger')
  getFinanceLedger(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.couriers.getCourierFinanceLedger(req.user, id, {
      page: toInt(page, 1),
      limit: toInt(limit, 50),
      from,
      to,
    });
  }

  @Post(':id/finance/payout')
  createPayout(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.couriers.createCourierPayout(req.user, id, {
      amount: body?.amount,
      comment: body?.comment ?? null,
    });
  }

  @Patch(':id/finance/commission')
  setCommission(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    // API оставляем совместимым: commissionPctOverride (как было).
    // В сервисе это маппится на courierCommissionPctOverride.
    return this.couriers.setCourierCommissionOverride(req.user, id, {
      commissionPctOverride: body?.commissionPctOverride === '' ? null : body?.commissionPctOverride,
    });
  }

  @Patch(':id/personal-fee')
  setPersonalFee(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const feeRaw = body?.fee;
    const fee = feeRaw == null ? null : Number(feeRaw);
    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
      throw new BadRequestException('fee must be >= 0 or null');
    }
    return this.couriers.setCourierPersonalFeeOverride(req.user, id, {
      fee: fee === null ? null : Math.round(fee),
    });
  }
}