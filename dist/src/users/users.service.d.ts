import { PrismaService } from '../prisma/prisma.service';
type Segment = 'NEW' | 'REGULAR' | 'VIP';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCustomers(page?: number, limit?: number, q?: string, segment?: string): Promise<{
        items: {
            id: string;
            phone: string;
            name: string | null;
            ordersCount: number;
            lastOrderAt: string | null;
            lastOrderStatus: string | null;
            lastOrderTotal: any;
            segment: Segment;
            createdAt: string;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    private buildUserSearchSql;
    getCustomerDetails(id: string): Promise<{
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
        segment: Segment;
        createdAt: string;
    }>;
    getCustomerOrders(id: string, page?: number, limit?: number): Promise<{
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
export {};
