import { FoodCategoriesService } from './food-categories.service';
import { CreateFoodCategoryDto } from './dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food-category.dto';
export declare class FoodCategoriesController {
    private readonly service;
    constructor(service: FoodCategoriesService);
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
    list(restaurantId?: string): Promise<{
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
    update(restaurantId: string, categoryId: string, dto: UpdateFoodCategoryDto): Promise<{
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
    delete(restaurantId: string, categoryId: string, force?: string): Promise<{
        success: boolean;
    }>;
}
