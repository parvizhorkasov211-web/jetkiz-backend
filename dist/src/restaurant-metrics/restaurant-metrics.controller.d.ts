import { RestaurantMetricsService } from './restaurant-metrics.service';
export declare class RestaurantMetricsController {
    private readonly service;
    constructor(service: RestaurantMetricsService);
    getRestaurantMetrics(restaurantId: string, days?: string, from?: string, to?: string): Promise<{
        restaurant: {
            id: string;
            slug: string;
            nameRu: string;
            nameKk: string;
            status: import("@prisma/client").$Enums.RestaurantStatus;
        };
        period: {
            from: string;
            to: string;
            days: number;
        };
        totalOrders: number;
        deliveredCount: number;
        canceledCount: number;
        paidCount: number;
        revenue: {
            totalPaid: number;
            totalDelivered: number;
            totalRevenue: number;
        };
        avgCheckRevenue: number;
        trendRevenuePercent: number | null;
        rates: {
            cancelRatePercent: number;
            paidRatePercent: number;
            deliveredRatePercent: number;
        };
        customers: {
            activeCustomers: number;
            activeCustomers7d: number;
            activeCustomers30d: number;
            newCustomers: number;
            repeatRatePercent: number;
            rfmDistribution: Record<string, number>;
        };
        reviews: {
            ratingAvg: number | null;
            reviewsCount: number;
            reviewRatePercent: number;
        };
        daily: {
            date: string;
            orders: number;
            delivered: number;
            canceled: number;
            paid: number;
            revenue: number;
        }[];
        topClients: {
            userId: string;
            phone: string | null;
            name: string | null;
            ordersCount: number;
            spent: number;
            lastOrderAt: Date | null;
            recencyDays: number | null;
            status: string;
        }[];
        recentOrders: {
            id: string;
            createdAt: string;
            status: import("@prisma/client").$Enums.OrderStatus;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            total: number;
            userId: string;
            userName: string | null;
            userPhone: string;
        }[];
        suggestions: {
            type: "warning" | "info" | "success";
            title: string;
            text: string;
        }[];
    }>;
}
