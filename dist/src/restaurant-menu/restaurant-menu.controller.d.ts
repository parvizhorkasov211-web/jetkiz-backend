import { RestaurantMenuService } from './restaurant-menu.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class RestaurantMenuController {
    private readonly service;
    constructor(service: RestaurantMenuService);
    getMenu(restaurantId: string, includeUnavailable?: string): Promise<{
        restaurant: {
            id: string;
            slug: string;
            nameRu: string;
            nameKk: string;
            status: import("@prisma/client").$Enums.RestaurantStatus;
            isInApp: boolean;
        };
        includeUnavailable: boolean;
        categoriesTotal: number;
        itemsTotal: number;
        grouped: {
            category: {
                id: string;
                titleRu: string;
                titleKk: string;
                iconUrl: string | null;
                sortOrder: number;
            };
            items: {
                id: string;
                titleRu: string;
                titleKk: string;
                price: number;
                imageUrl: string | null;
                isAvailable: boolean;
                categoryId: string | null;
                weight: string | null;
                composition: string | null;
                description: string | null;
                isDrink: boolean;
                createdAt: Date;
                updatedAt: Date;
                images?: {
                    id: string;
                    url: string;
                    isMain: boolean;
                    sortOrder: number;
                }[];
                category?: {
                    id: string;
                    titleRu: string;
                    titleKk: string;
                    iconUrl: string | null;
                    sortOrder: number;
                } | null;
            }[];
        }[];
        categories: {
            id: string;
            sortOrder: number;
            titleRu: string;
            titleKk: string;
            iconUrl: string | null;
        }[];
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            titleRu: string;
            titleKk: string;
            price: number;
            imageUrl: string | null;
            isAvailable: boolean;
            categoryId: string | null;
            weight: string | null;
            composition: string | null;
            description: string | null;
            isDrink: boolean;
            category: {
                id: string;
                sortOrder: number;
                titleRu: string;
                titleKk: string;
                iconUrl: string | null;
            } | null;
            images: {
                id: string;
                sortOrder: number;
                url: string;
                isMain: boolean;
            }[];
        }[];
    }>;
    createProduct(restaurantId: string, dto: CreateProductDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        titleRu: string;
        titleKk: string;
        price: number;
        imageUrl: string | null;
        isAvailable: boolean;
        categoryId: string | null;
        weight: string | null;
        composition: string | null;
        description: string | null;
        isDrink: boolean;
    }>;
    updateProduct(restaurantId: string, productId: string, dto: UpdateProductDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        titleRu: string;
        titleKk: string;
        price: number;
        imageUrl: string | null;
        isAvailable: boolean;
        categoryId: string | null;
        weight: string | null;
        composition: string | null;
        description: string | null;
        isDrink: boolean;
    }>;
    uploadProductImages(restaurantId: string, productId: string, files: {
        main?: Express.Multer.File[];
        others?: Express.Multer.File[];
    }): Promise<{
        id: string;
        imageUrl: string | null;
        images: {
            id: string;
            sortOrder: number;
            url: string;
            isMain: boolean;
        }[];
    } | null>;
    addProductImages(restaurantId: string, productId: string, files: Express.Multer.File[]): Promise<{
        id: string;
        imageUrl: string | null;
        images: {
            id: string;
            sortOrder: number;
            url: string;
            isMain: boolean;
        }[];
    } | null>;
    setMain(restaurantId: string, productId: string, imageId: string): Promise<{
        id: string;
        imageUrl: string | null;
        images: {
            id: string;
            sortOrder: number;
            url: string;
            isMain: boolean;
        }[];
    } | null>;
    deleteImage(restaurantId: string, productId: string, imageId: string): Promise<{
        id: string;
        imageUrl: string | null;
        images: {
            id: string;
            sortOrder: number;
            url: string;
            isMain: boolean;
        }[];
    } | null>;
    deleteProduct(restaurantId: string, productId: string): Promise<{
        success: boolean;
    }>;
}
