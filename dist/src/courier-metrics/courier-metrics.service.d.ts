import { PrismaService } from '../prisma/prisma.service';
type JwtUser = {
    id: string;
    role?: string;
};
export declare class CourierMetricsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureAdmin;
    private getCourierUserIdsForMetrics;
    completedCount(user: JwtUser, courierUserId: string, opts?: {
        range?: 'day' | 'month' | 'year';
        from?: string;
        to?: string;
    }): Promise<{
        courierUserId: string;
        range: any;
        period: {
            from: string | null;
            to: string | null;
        } | null;
        totalCompleted: number;
        generatedAt: string;
    }>;
    onTimeRate(user: JwtUser, courierUserId: string, from?: string, to?: string, slaMin?: number): Promise<{
        courierUserId: string;
        period: {
            from: string;
            to: string;
        };
        slaMin: number;
        totalDelivered: number;
        onTimeDelivered: number;
        ratePct: number;
        generatedAt: string;
    }>;
    realtime(user: JwtUser): Promise<{
        summary: {
            totalCouriers: number;
            online: number;
            sleeping: number;
            activeOrders: number;
        };
        items: {
            courierUserId: string;
            name: string;
            isOnline: boolean;
            lastSeenAt: string | null;
            lastActiveAt: string | null;
            sleeping: boolean;
            activeOrdersByStatus: Record<string, number>;
            todayDelivered: number;
            todayEarned: number;
        }[];
        generatedAt: string;
    }>;
    statusSummary(user: JwtUser): Promise<{
        total: number;
        online: number;
        offline: number;
        busy: number;
        sleeping: number;
        generatedAt: string;
    }>;
    statusList(user: JwtUser, opts: {
        tab?: 'ONLINE' | 'OFFLINE' | 'BUSY';
        limit?: number;
    }): Promise<{
        tab: "ONLINE" | "OFFLINE" | "BUSY";
        limit: number;
        items: {
            courierUserId: string;
            name: string;
            tabStatus: "ONLINE" | "OFFLINE" | "BUSY";
            isOnline: boolean;
            lastSeenAt: string | null;
            lastActiveAt: string | null;
        }[];
        generatedAt: string;
    }>;
    onlineSeries(user: JwtUser, opts: {
        range?: 'day' | 'week' | 'month';
        from?: string;
        to?: string;
    }): Promise<{
        range: "week" | "day" | "month";
        bucket: "day" | "hour";
        period: {
            from: string;
            to: string;
        };
        series: {
            bucket: string;
            seenUnique: number;
            activeUnique: number;
        }[];
    }>;
    onlineTimeline(user: JwtUser, opts: {
        from?: string;
        to?: string;
        bucket?: 'hour' | 'day';
    }): Promise<{
        period: {
            from: string;
            to: string;
        };
        bucket: "day" | "hour";
        points: {
            ts: string;
            online: number;
        }[];
        generatedAt: string;
    }>;
    byCourier(user: JwtUser, courierUserId: string, from?: string, to?: string): Promise<{
        courierUserId: string;
        period: {
            from: string;
            to: string;
        };
        totals: {
            orders: number;
            delivered: number;
            canceled: number;
            active: number;
            earned: number;
            avgDeliveryMin: number | null;
        };
        recent: {
            id: string;
            status: import("@prisma/client").$Enums.OrderStatus;
            createdAt: string;
            assignedAt: string | null;
            deliveredAt: string | null;
            courierFee: number;
            orderTotal: number;
        }[];
    }>;
}
export {};
