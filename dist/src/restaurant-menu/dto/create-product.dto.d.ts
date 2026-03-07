export declare class CreateProductDto {
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
}
