import { UsersService } from './users.service';
import { CustomerMetricsService } from './customer-metrics.service';
export declare class UsersController {
    private readonly users;
    private readonly customerMetrics;
    constructor(users: UsersService, customerMetrics: CustomerMetricsService);
    customers(page?: string, limit?: string, q?: string, segment?: string): Promise<{
        items: {
            id: string;
            phone: string;
            name: string | null;
            ordersCount: number;
            lastOrderAt: string | null;
            lastOrderStatus: string | null;
            lastOrderTotal: any;
            segment: "VIP" | "NEW" | "REGULAR";
            createdAt: string;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    customer(id: string): Promise<{
        id: string;
        phone: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        avatarUrl: string | null;
        name: string | null;
        ordersCount: number;
        lastOrderAt: string | null;
        lastOrderStatus: import("@prisma/client").$Enums.OrderStatus;
        lastOrderTotal: number;
        segment: "VIP" | "NEW" | "REGULAR";
        createdAt: string;
    }>;
    customerMetricsById(id: string): Promise<import("./customer-metrics.service").CustomerMetricsDto>;
    customerOrders(id: string, page?: string, limit?: string): Promise<{
        items: {
            id: string;
            status: import("@prisma/client").$Enums.OrderStatus;
            total: number;
            createdAt: string;
            restaurant: {
                id: string;
                nameRu: string;
            };
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
}
