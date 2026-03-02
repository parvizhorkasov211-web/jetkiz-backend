declare class CreateOrderItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    restaurantId: string;
    addressId: string;
    phone: string;
    leaveAtDoor: boolean;
    comment?: string;
    items: CreateOrderItemDto[];
}
export {};
