import { RestaurantReviewsService } from './restaurant-reviews.service';
export declare class RestaurantReviewsController {
    private readonly service;
    constructor(service: RestaurantReviewsService);
    getRestaurantReviews(restaurantId: string, from?: string, to?: string, page?: string, limit?: string, includeUser?: string, includeOrder?: string): Promise<{
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
