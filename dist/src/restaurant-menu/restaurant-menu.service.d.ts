import { PrismaService } from '../prisma/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';
type MenuCategoryDto = {
    id: string;
    titleRu: string;
    titleKk: string;
    iconUrl: string | null;
    sortOrder: number;
};
type MenuItemImageDto = {
    id: string;
    url: string;
    isMain: boolean;
    sortOrder: number;
};
type MenuItemDto = {
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
    images?: MenuItemImageDto[];
    category?: MenuCategoryDto | null;
};
export declare class RestaurantMenuService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRestaurantMenu(input: {
        restaurantId: string;
        includeUnavailable: boolean;
    }): Promise<{
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
            category: MenuCategoryDto;
            items: MenuItemDto[];
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
    createProduct(input: {
        restaurantId: string;
        categoryId: string;
        titleRu: string;
        titleKk: string;
        price: number;
        weight?: string | null;
        composition?: string | null;
        description?: string | null;
        isDrink?: boolean;
        mainImageUrl?: string | null;
        additionalImageUrls?: string[] | null;
    }): Promise<{
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
    updateProduct(input: {
        restaurantId: string;
        productId: string;
        dto: UpdateProductDto;
    }): Promise<{
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
    setProductImages(input: {
        restaurantId: string;
        productId: string;
        mainFile: Express.Multer.File | null;
        otherFiles: Express.Multer.File[];
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
    addProductImages(input: {
        restaurantId: string;
        productId: string;
        files: Express.Multer.File[];
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
    setMainProductImage(input: {
        restaurantId: string;
        productId: string;
        imageId: string;
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
    deleteProductImage(input: {
        restaurantId: string;
        productId: string;
        imageId: string;
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
    deleteProduct(input: {
        restaurantId: string;
        productId: string;
    }): Promise<{
        success: boolean;
    }>;
}
export {};
