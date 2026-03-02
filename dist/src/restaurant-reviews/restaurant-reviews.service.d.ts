import { PrismaService } from '../prisma/prisma.service';
export declare class RestaurantReviewsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRestaurantReviews(input: {
        restaurantId: string;
        from?: string;
        to?: string;
        page: number;
        limit: number;
        includeUser: boolean;
        includeOrder: boolean;
    }): Promise<{
        items: ({
            [x: string]: never;
            [x: number]: never;
            [x: symbol]: never;
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            restaurantId: string;
            rating: number;
            text: string | null;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
}
