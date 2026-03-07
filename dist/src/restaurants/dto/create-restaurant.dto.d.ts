import { RestaurantStatus } from '@prisma/client';
export declare class CreateRestaurantDto {
    nameRu: string;
    nameKk: string;
    phone?: string;
    address?: string;
    workingHours?: string;
    status?: RestaurantStatus;
}
