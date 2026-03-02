import { PrismaService } from '../prisma/prisma.service';
import { UpdateCourierProfileDto } from './dto/update-courier-profile.dto';
import { BlockCourierDto } from './dto/block-courier.dto';
type JwtUser = {
    id: string;
    role?: string;
};
export declare class CouriersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureAdmin;
    getActiveTariffPublic(user: JwtUser): Promise<{
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
    setGlobalTariff(user: JwtUser, body: {
        fee: number;
    }): Promise<{
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
    getGlobalCommissionDefault(user: JwtUser): Promise<{
        pct: number;
    }>;
    setGlobalCommissionDefault(user: JwtUser, body: {
        pct: number;
    }): Promise<{
        pct: number;
    }>;
    setCourierPersonalFeeOverride(user: JwtUser, courierUserId: string, body: {
        fee: number | null;
    }): Promise<{
        updatedAt: Date;
        userId: string;
        personalFeeOverride: number | null;
        payoutBonusAdd: number;
    }>;
    getCourierStatusSummary(user: JwtUser): Promise<{
        total: number;
        online: number;
        offline: number;
        busy: number;
        generatedAt: string;
    }>;
    getCourierOnlineTimeline(user: JwtUser): Promise<{
        hour: number;
        ts: string;
        online: number;
    }[]>;
    getCourierOnlineSeries(user: JwtUser): Promise<{
        bucket: string;
        seenUnique: number;
        activeUnique: number;
    }[]>;
    getCouriersAdmin(user: JwtUser, opts: {
        page: number;
        limit: number;
        q?: string;
        online?: string;
        active?: string;
    }): Promise<{
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
    createCourier(user: JwtUser, dto: any): Promise<{
        id: string;
    }>;
    getCourierAdminById(user: JwtUser, courierUserId: string): Promise<{
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
    uploadMyAvatar(user: JwtUser, file?: Express.Multer.File): Promise<{
        ok: boolean;
        avatarUrl: string;
    }>;
    uploadCourierAvatar(user: JwtUser, courierUserId: string, file?: Express.Multer.File): Promise<{
        ok: boolean;
        avatarUrl: string;
    }>;
    updateCourierProfile(user: JwtUser, courierUserId: string, dto: UpdateCourierProfileDto): Promise<{
        userId: string;
    }>;
    blockCourier(user: JwtUser, courierUserId: string, dto: BlockCourierDto): Promise<{
        userId: string;
        blockedAt: Date | null;
        blockReason: string | null;
    }>;
    setCourierOnline(user: JwtUser, courierUserId: string, body: any): Promise<{
        userId: string;
        isOnline: boolean;
        lastSeenAt: Date | null;
        lastActiveAt: Date | null;
    }>;
    assignOrderToCourier(user: JwtUser, courierUserId: string, body: any): Promise<{
        ok: boolean;
    }>;
    unassignOrderFromCourier(user: JwtUser, courierUserId: string, body: any): Promise<{
        ok: boolean;
    }>;
    getCourierOrThrow(courierUserId: string): Promise<{
        userId: string;
    }>;
    getCourierFinanceSummary(user: JwtUser, courierUserId: string, opts: any): Promise<{
        totalIncome: number;
        totalPayout: number;
        balance: number;
    }>;
    getCourierFinanceLedger(user: JwtUser, courierUserId: string, opts: any): Promise<{
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
    createCourierPayout(user: JwtUser, courierUserId: string, body: any): Promise<{
        ok: boolean;
    }>;
    setCourierCommissionOverride(user: JwtUser, courierUserId: string, body: any): Promise<{
        userId: string;
        courierCommissionPctOverride: number | null;
    }>;
}
export {};
