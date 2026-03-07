import { ClientReviewsService } from './client-reviews.service';
export declare class ClientReviewsController {
    private readonly service;
    constructor(service: ClientReviewsService);
    getCustomerReviews(userId: string, includeOrder?: string, page?: string, limit?: string): Promise<{
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
}
