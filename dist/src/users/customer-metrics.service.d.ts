import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type LastOrderDto = {
    id: string;
    createdAt: Date;
    total: number;
    status: OrderStatus;
    restaurantId: string;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
};
export type CustomerMetricsDto = {
    userId: string;
    totalOrders: number;
    deliveredCount: number;
    canceledCount: number;
    totalSpent: number;
    avgCheck: number;
    firstOrderDate: Date | null;
    lastOrderDate: Date | null;
    daysSinceLastOrder: number | null;
    lastOrder: LastOrderDto | null;
};
export declare class CustomerMetricsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMetrics(userId: string): Promise<CustomerMetricsDto>;
}
export {};
