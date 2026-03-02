import { PrismaService } from '../prisma/prisma.service';
type JwtUser = {
    id: string;
    role?: string;
};
export declare class ClientMetricsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureAdmin;
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
    onlineTimeline(user: JwtUser, opts: {
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
            onlineCount: number;
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
