import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
export declare class RestaurantsController {
    private readonly restaurants;
    constructor(restaurants: RestaurantsService);
    getFinanceConfig(): Promise<{
        id: string;
        updatedAt: Date;
        clientDeliveryFeeDefault: number;
        clientDeliveryFeeWeather: number;
        courierPayoutDefault: number;
        courierPayoutWeather: number;
        courierCommissionPctDefault: number;
        restaurantCommissionPctDefault: number;
        weatherEnabled: boolean;
    }>;
    updateFinanceConfig(body: {
        clientDeliveryFeeDefault?: number;
        clientDeliveryFeeWeather?: number;
        courierPayoutDefault?: number;
        courierPayoutWeather?: number;
        courierCommissionPctDefault?: number;
        restaurantCommissionPctDefault?: number;
        weatherEnabled?: boolean;
    }): Promise<{
        id: string;
        updatedAt: Date;
        clientDeliveryFeeDefault: number;
        clientDeliveryFeeWeather: number;
        courierPayoutDefault: number;
        courierPayoutWeather: number;
        courierCommissionPctDefault: number;
        restaurantCommissionPctDefault: number;
        weatherEnabled: boolean;
    }>;
    getRestaurantCommissionDefault(): Promise<{
        restaurantCommissionPctDefault: number;
        updatedAt: Date;
    }>;
    setRestaurantCommissionDefault(body: {
        restaurantCommissionPctDefault?: number;
    }): Promise<{
        updatedAt: Date;
        restaurantCommissionPctDefault: number;
    }>;
    findAll(q?: string, status?: 'OPEN' | 'CLOSED'): Promise<{
        runtimeStatus: "OPEN" | "CLOSED";
        effectiveRestaurantCommissionPct: number;
        number: number;
        address: string | null;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameRu: string;
        nameKk: string;
        workingHours: string | null;
        coverImageUrl: string | null;
        ratingAvg: number;
        ratingCount: number;
        status: import("@prisma/client").$Enums.RestaurantStatus;
        isInApp: boolean;
        restaurantCommissionPctOverride: number | null;
        isPinned: boolean;
        sortOrder: number;
        useRandom: boolean;
    }[]>;
    list(random?: string): Promise<{
        pinned: {
            number: number;
            address: string | null;
            id: string;
            phone: string | null;
            slug: string;
            nameRu: string;
            nameKk: string;
            workingHours: string | null;
            coverImageUrl: string | null;
            ratingAvg: number;
            ratingCount: number;
            status: import("@prisma/client").$Enums.RestaurantStatus;
            isInApp: boolean;
            restaurantCommissionPctOverride: number | null;
            isPinned: boolean;
            sortOrder: number;
            useRandom: boolean;
        }[];
        items: {
            number: number;
            address: string | null;
            id: string;
            phone: string | null;
            slug: string;
            nameRu: string;
            nameKk: string;
            workingHours: string | null;
            coverImageUrl: string | null;
            ratingAvg: number;
            ratingCount: number;
            status: import("@prisma/client").$Enums.RestaurantStatus;
            isInApp: boolean;
            restaurantCommissionPctOverride: number | null;
            isPinned: boolean;
            sortOrder: number;
            useRandom: boolean;
        }[];
    }>;
    getOne(id: string): Promise<{
        effectiveRestaurantCommissionPct: number;
        number: number;
        address: string | null;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameRu: string;
        nameKk: string;
        workingHours: string | null;
        descriptionRu: string | null;
        descriptionKk: string | null;
        coverImageUrl: string | null;
        ratingAvg: number;
        ratingCount: number;
        status: import("@prisma/client").$Enums.RestaurantStatus;
        isInApp: boolean;
        restaurantCommissionPctOverride: number | null;
        isPinned: boolean;
        sortOrder: number;
        useRandom: boolean;
    }>;
    create(dto: CreateRestaurantDto): Promise<{
        number: number;
        address: string | null;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameRu: string;
        nameKk: string;
        workingHours: string | null;
        status: import("@prisma/client").$Enums.RestaurantStatus;
        isInApp: boolean;
        restaurantCommissionPctOverride: number | null;
    }>;
    setInApp(id: string, body: {
        isInApp?: boolean;
    }): Promise<{
        number: number;
        address: string | null;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameRu: string;
        nameKk: string;
        workingHours: string | null;
        status: import("@prisma/client").$Enums.RestaurantStatus;
        isInApp: boolean;
        restaurantCommissionPctOverride: number | null;
        isPinned: boolean;
        sortOrder: number;
        useRandom: boolean;
    }>;
    setRestaurantCommissionOverride(id: string, body: {
        restaurantCommissionPctOverride?: number | null;
    }): Promise<{
        effectiveRestaurantCommissionPct: number;
        number: number;
        address: string | null;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameRu: string;
        nameKk: string;
        workingHours: string | null;
        status: import("@prisma/client").$Enums.RestaurantStatus;
        isInApp: boolean;
        restaurantCommissionPctOverride: number | null;
        isPinned: boolean;
        sortOrder: number;
        useRandom: boolean;
    }>;
    resetRestaurantCommissionOverride(id: string): Promise<{
        effectiveRestaurantCommissionPct: number;
        number: number;
        address: string | null;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameRu: string;
        nameKk: string;
        workingHours: string | null;
        status: import("@prisma/client").$Enums.RestaurantStatus;
        isInApp: boolean;
        restaurantCommissionPctOverride: number | null;
        isPinned: boolean;
        sortOrder: number;
        useRandom: boolean;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
    products(restaurantId: string, includeUnavailable?: string): Promise<{
        restaurant: {
            number: number;
            id: string;
            slug: string;
            nameRu: string;
            nameKk: string;
            status: import("@prisma/client").$Enums.RestaurantStatus;
        };
        products: {
            id: string;
            titleRu: string;
            titleKk: string;
            price: number;
            imageUrl: string | null;
            isAvailable: boolean;
            category: {
                id: string;
                sortOrder: number;
                code: string;
                titleRu: string;
                titleKk: string;
                iconUrl: string | null;
            } | null;
        }[];
    }>;
}
