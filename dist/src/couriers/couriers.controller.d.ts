import { CouriersService } from './couriers.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierProfileDto } from './dto/update-courier-profile.dto';
import { BlockCourierDto } from './dto/block-courier.dto';
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
export declare class CouriersController {
    private readonly couriers;
    constructor(couriers: CouriersService);
    getActiveTariff(req: any): Promise<{
        id: string;
        isActive: boolean;
        fee: number;
        startsAt: Date | null;
        endsAt: Date | null;
    } | {
        id: null;
        fee: number;
        isActive: false;
    }>;
    setGlobalTariff(req: any, body: any): Promise<{
        id: string;
        isActive: boolean;
        fee: number;
        startsAt: Date | null;
        endsAt: Date | null;
    } | {
        id: null;
        fee: number;
        isActive: false;
    }>;
    getGlobalCommissionDefault(req: any): Promise<{
        pct: number;
    }>;
    setGlobalCommissionDefault(req: any, body: any): Promise<{
        pct: number;
    }>;
    getStatusSummary(req: any): Promise<{
        total: number;
        online: number;
        offline: number;
        busy: number;
        generatedAt: string;
    }>;
    getOnlineTimeline(req: any): Promise<{
        hour: number;
        ts: string;
        online: number;
    }[]>;
    getOnlineSeries(req: any): Promise<{
        bucket: string;
        seenUnique: number;
        activeUnique: number;
    }[]>;
    uploadMyAvatar(req: any, file?: Express.Multer.File): Promise<{
        ok: boolean;
        avatarUrl: string;
    }>;
    getList(req: any, page?: string, limit?: string, q?: string, online?: string, active?: string): Promise<{
        total: number;
        page: number;
        limit: number;
        items: {
            id: any;
            userId: any;
            phone: any;
            avatarUrl: any;
            isActive: any;
            firstName: any;
            lastName: any;
            iin: any;
            addressText: any;
            comment: any;
            blockedAt: any;
            blockReason: any;
            isOnline: any;
            personalFeeOverride: any;
            payoutBonusAdd: any;
            courierCommissionPctOverride: any;
            lastSeenAt: any;
            lastActiveAt: any;
            lastAssignedAt: any;
            lastOnlineAt: string | null;
            lastOfflineAt: string | null;
            onlineForSec: number | null;
            lastSessionSec: number | null;
            seenAgoSec: number | null;
            activeAgoSec: number | null;
            assignedAgoSec: number | null;
        }[];
    }>;
    createCourier(req: any, dto: CreateCourierDto): Promise<{
        id: string;
    }>;
    getOne(req: any, id: string): Promise<{
        id: string;
        userId: string;
        phone: string;
        isActive: boolean;
        avatarUrl: string | null;
        firstName: string;
        lastName: string;
        iin: string;
        addressText: string | null;
        comment: string | null;
        blockedAt: Date | null;
        blockReason: string | null;
        isOnline: boolean;
        personalFeeOverride: number | null;
        payoutBonusAdd: number;
        courierCommissionPctOverride: number | null;
        lastSeenAt: Date | null;
        lastActiveAt: Date | null;
        lastAssignedAt: Date | null;
        activeOrders: {
            restaurant: {
                id: string;
                nameRu: string;
            };
            id: string;
            phone: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.OrderStatus;
            total: number;
            addressId: string;
            assignedAt: Date | null;
        }[];
        activeTariff: {
            id: string;
            isActive: boolean;
            fee: number;
            startsAt: Date | null;
            endsAt: Date | null;
        } | {
            id: null;
            fee: number;
            isActive: false;
        };
    }>;
    uploadAvatar(req: any, id: string, file?: Express.Multer.File): Promise<{
        ok: boolean;
        avatarUrl: string;
    }>;
    updateProfile(req: any, id: string, dto: UpdateCourierProfileDto): Promise<{
        userId: string;
    }>;
    blockCourier(req: any, id: string, dto: BlockCourierDto): Promise<{
        userId: string;
        blockedAt: Date | null;
        blockReason: string | null;
    }>;
    setOnline(req: any, id: string, body: any): Promise<{
        userId: string;
        isOnline: boolean;
        lastSeenAt: Date | null;
        lastActiveAt: Date | null;
    }>;
    assignOrder(req: any, id: string, body: any): Promise<{
        ok: boolean;
    }>;
    unassignOrder(req: any, id: string, body: any): Promise<{
        ok: boolean;
    }>;
    getFinanceSummary(req: any, id: string, from?: string, to?: string): Promise<{
        totalIncome: number;
        totalPayout: number;
        balance: number;
    }>;
    getFinanceLedger(req: any, id: string, page?: string, limit?: string, from?: string, to?: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            comment: string | null;
            courierUserId: string;
            orderId: string | null;
            type: import("@prisma/client").$Enums.LedgerType;
            amount: number;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    createPayout(req: any, id: string, body: any): Promise<{
        ok: boolean;
    }>;
    setCommission(req: any, id: string, body: any): Promise<{
        userId: string;
        courierCommissionPctOverride: number | null;
    }>;
    setPersonalFee(req: any, id: string, body: any): Promise<{
        updatedAt: Date;
        userId: string;
        personalFeeOverride: number | null;
        payoutBonusAdd: number;
    }>;
}
