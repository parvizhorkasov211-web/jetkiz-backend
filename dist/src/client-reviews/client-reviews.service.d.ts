import { PrismaService } from '../prisma/prisma.service';
type GetReviewsOpts = {
    includeOrder: boolean;
    page: number;
    limit: number;
};
export declare class ClientReviewsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCustomerReviews(userId: string, opts: GetReviewsOpts): Promise<{
        items: {
            [x: string]: never;
            [x: number]: never;
            [x: symbol]: never;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    getCustomerReviewsAggregate(userId: string): Promise<{
        reviewsCount: any;
        avgRating: any;
    }>;
}
export {};
