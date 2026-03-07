import { ClientMetricsService } from './client-metrics.service';
export declare class ClientMetricsController {
    private readonly service;
    constructor(service: ClientMetricsService);
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
    onlineTimeline(req: any, q: {
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
}
