import { CourierMetricsService } from './courier-metrics.service';
export declare class CourierMetricsController {
    private readonly svc;
    constructor(svc: CourierMetricsService);
    realtime(req: any): Promise<{
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
    statusSummary(req: any): Promise<{
        total: number;
        online: number;
        offline: number;
        busy: number;
        sleeping: number;
        generatedAt: string;
    }>;
    statusList(req: any, tab?: 'ONLINE' | 'OFFLINE' | 'BUSY', limit?: string): Promise<{
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
    byCourier(req: any, courierUserId: string, from?: string, to?: string): Promise<{
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
    onlineSeries(req: any, range?: 'day' | 'week' | 'month', from?: string, to?: string): Promise<{
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
    onlineTimeline(req: any, from?: string, to?: string, bucket?: 'hour' | 'day'): Promise<{
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
    onTimeRate(req: any, courierUserId: string, from?: string, to?: string, slaMin?: string): Promise<{
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
    completedCount(req: any, courierUserId: string, range?: 'day' | 'month' | 'year', from?: string, to?: string): Promise<{
        courierUserId: string;
        range: any;
        period: {
            from: string | null;
            to: string | null;
        } | null;
        totalCompleted: number;
        generatedAt: string;
    }>;
}
