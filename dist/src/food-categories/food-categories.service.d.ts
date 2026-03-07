import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodCategoryDto } from './dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food-category.dto';
export declare class FoodCategoriesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateFoodCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        restaurantId: string;
        code: string;
        titleRu: string;
        titleKk: string;
        iconUrl: string | null;
    }>;
    listByRestaurant(restaurantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        restaurantId: string;
        code: string;
        titleRu: string;
        titleKk: string;
        iconUrl: string | null;
    }[]>;
    update(input: {
        restaurantId: string;
        categoryId: string;
        dto: UpdateFoodCategoryDto;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        restaurantId: string;
        code: string;
        titleRu: string;
        titleKk: string;
        iconUrl: string | null;
    }>;
    delete(input: {
        restaurantId: string;
        categoryId: string;
        force: boolean;
    }): Promise<{
        success: boolean;
    }>;
}
