import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
type JwtUser = {
    id: string;
    role?: 'CLIENT' | 'ADMIN' | 'COURIER' | 'RESTAURANT';
    restaurantId?: string;
    courierId?: string | null;
};
export declare class OrdersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private readonly FIN_CONFIG_ID;
    private readonly DEFAULT_PROMISED_MIN;
    private computePromisedAt;
    private isDigits;
    private parseOrderNumber;
    private resolveOrderUuid;
    private ensureAdmin;
    private getOrCreateFinanceConfig;
    getFinanceConfig(user: JwtUser): Promise<{
        id: string;
        clientDeliveryFeeDefault: number;
        clientDeliveryFeeWeather: number;
        courierPayoutDefault: number;
        courierPayoutWeather: number;
        courierCommissionPctDefault: number;
        restaurantCommissionPctDefault: number;
        weatherEnabled: boolean;
        updatedAt: Date;
    }>;
    updateFinanceConfig(user: JwtUser, body: {
        clientDeliveryFeeDefault?: number;
        clientDeliveryFeeWeather?: number;
        courierPayoutDefault?: number;
        courierPayoutWeather?: number;
        weatherEnabled?: boolean;
    }): Promise<{
        id: string;
        clientDeliveryFeeDefault: number;
        clientDeliveryFeeWeather: number;
        courierPayoutDefault: number;
        courierPayoutWeather: number;
        courierCommissionPctDefault: number;
        restaurantCommissionPctDefault: number;
        weatherEnabled: boolean;
        updatedAt: Date;
    }>;
    setManualDeliveryFee(user: JwtUser, orderIdOrNumber: string, deliveryFee: number): Promise<{
        number: number;
        id: string;
        updatedAt: Date;
        subtotal: number;
        deliveryFee: number;
        total: number;
        pricingSource: import("@prisma/client").$Enums.PricingSource;
    }>;
    private computeClientDeliveryFeeApplied;
    private computeCourierPayoutApplied;
    getAdminOrderByNumber(number: number): Promise<{
        number: number;
        user: {
            id: string;
            phone: string;
            firstName: string | null;
            lastName: string | null;
        };
        restaurant: {
            id: string;
            slug: string;
            nameRu: string;
            nameKk: string;
            coverImageUrl: string | null;
            status: import("@prisma/client").$Enums.RestaurantStatus;
        };
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        comment: string | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        restaurantId: string;
        subtotal: number;
        deliveryFee: number;
        total: number;
        addressId: string;
        leaveAtDoor: boolean;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        ratingGiven: boolean;
        courierId: string | null;
        courierFee: number;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        pricingSource: import("@prisma/client").$Enums.PricingSource;
        courierBonusApplied: number;
        courier: {
            user: {
                phone: string;
            };
            firstName: string;
            lastName: string;
            userId: string;
            isOnline: boolean;
        } | null;
        items: {
            id: string;
            price: number;
            title: string;
            quantity: number;
            productId: string;
        }[];
    }>;
    getOrderByNumber(userId: string, number: number): Promise<{
        number: number;
        restaurant: {
            id: string;
            slug: string;
            nameRu: string;
            nameKk: string;
            coverImageUrl: string | null;
            status: import("@prisma/client").$Enums.RestaurantStatus;
        };
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        comment: string | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        restaurantId: string;
        subtotal: number;
        deliveryFee: number;
        total: number;
        addressId: string;
        leaveAtDoor: boolean;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        ratingGiven: boolean;
        courierId: string | null;
        courierFee: number;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        pricingSource: import("@prisma/client").$Enums.PricingSource;
        courierBonusApplied: number;
        courier: {
            user: {
                phone: string;
            };
            firstName: string;
            lastName: string;
            userId: string;
            isOnline: boolean;
        } | null;
        items: {
            id: string;
            price: number;
            title: string;
            quantity: number;
            productId: string;
        }[];
    }>;
    createOrder(userId: string, dto: CreateOrderDto): Promise<{
        restaurant: {
            id: string;
            slug: string;
            nameRu: string;
            nameKk: string;
            coverImageUrl: string | null;
            status: import("@prisma/client").$Enums.RestaurantStatus;
        };
        items: {
            id: string;
            price: number;
            title: string;
            quantity: number;
            productId: string;
        }[];
    } & {
        number: number;
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        comment: string | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        restaurantId: string;
        subtotal: number;
        deliveryFee: number;
        total: number;
        addressId: string;
        leaveAtDoor: boolean;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        ratingGiven: boolean;
        courierId: string | null;
        courierFee: number;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        promisedAt: Date | null;
        pricingSource: import("@prisma/client").$Enums.PricingSource;
        courierBonusApplied: number;
        courierFeeGross: number;
        courierCommissionPctApplied: number;
        courierCommissionAmount: number;
    }>;
    getMyOrders(userId: string, opts: {
        page: number;
        limit: number;
    }): Promise<{
        total: number;
        items: {
            id: string;
            number: number;
            createdAt: Date;
            status: import("@prisma/client").$Enums.OrderStatus;
            total: number;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
            restaurant: {
                id: string;
                slug: string;
                nameRu: string;
                coverImageUrl: string | null;
                ratingAvg: number;
                ratingCount: number;
                status: import("@prisma/client").$Enums.RestaurantStatus;
            };
            courierId: string | null;
            courierFee: number;
            deliveryFee: number;
            itemsCount: number;
            previewItems: {
                title: string;
                quantity: number;
            }[];
        }[];
    }>;
    getOrderById(userId: string | null, orderIdOrNumber: string): Promise<{
        number: number;
        restaurant: {
            id: string;
            slug: string;
            nameRu: string;
            nameKk: string;
            coverImageUrl: string | null;
            status: import("@prisma/client").$Enums.RestaurantStatus;
        };
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        comment: string | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        restaurantId: string;
        subtotal: number;
        deliveryFee: number;
        total: number;
        addressId: string;
        leaveAtDoor: boolean;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        ratingGiven: boolean;
        courierId: string | null;
        courierFee: number;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        pricingSource: import("@prisma/client").$Enums.PricingSource;
        courierBonusApplied: number;
        courier: {
            user: {
                phone: string;
            };
            firstName: string;
            lastName: string;
            userId: string;
            isOnline: boolean;
        } | null;
        items: {
            id: string;
            price: number;
            title: string;
            quantity: number;
            productId: string;
        }[];
    }>;
    getAdminOrders(opts: {
        page: number;
        limit: number;
        q?: string;
        status?: OrderStatus;
    }): Promise<{
        total: number;
        items: {
            id: string;
            number: number;
            createdAt: Date;
            status: import("@prisma/client").$Enums.OrderStatus;
            total: number;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
            deliveryFee: number;
            courierFee: number;
            pricingSource: import("@prisma/client").$Enums.PricingSource;
            courierBonusApplied: number;
            user: {
                id: string;
                phone: string;
                firstName: string | null;
                lastName: string | null;
            };
            restaurant: {
                id: string;
                slug: string;
                nameRu: string;
                coverImageUrl: string | null;
                status: import("@prisma/client").$Enums.RestaurantStatus;
            };
            courierId: string | null;
            courier: {
                user: {
                    phone: string;
                };
                firstName: string;
                lastName: string;
                userId: string;
            } | null;
            itemsCount: number;
            previewItems: {
                title: string;
                quantity: number;
            }[];
            assignedAt: Date | null;
            pickedUpAt: Date | null;
            deliveredAt: Date | null;
        }[];
    }>;
    getAdminOrderById(orderIdOrNumber: string): Promise<{
        number: number;
        user: {
            id: string;
            phone: string;
            firstName: string | null;
            lastName: string | null;
        };
        restaurant: {
            id: string;
            slug: string;
            nameRu: string;
            nameKk: string;
            coverImageUrl: string | null;
            status: import("@prisma/client").$Enums.RestaurantStatus;
        };
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        comment: string | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        restaurantId: string;
        subtotal: number;
        deliveryFee: number;
        total: number;
        addressId: string;
        leaveAtDoor: boolean;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        ratingGiven: boolean;
        courierId: string | null;
        courierFee: number;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        pricingSource: import("@prisma/client").$Enums.PricingSource;
        courierBonusApplied: number;
        courier: {
            user: {
                phone: string;
            };
            firstName: string;
            lastName: string;
            userId: string;
            isOnline: boolean;
        } | null;
        items: {
            id: string;
            price: number;
            title: string;
            quantity: number;
            productId: string;
        }[];
    }>;
    updateOrderStatus(user: JwtUser, orderIdOrNumber: string, next: OrderStatus): Promise<{
        number: number;
        id: string;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OrderStatus;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
    }>;
    private assertAssignableStatus;
    assignCourier(user: JwtUser, orderIdOrNumber: string, courierUserId: string): Promise<{
        number: number;
        id: string;
        courierId: string | null;
        courierFee: number;
        assignedAt: Date | null;
        pricingSource: import("@prisma/client").$Enums.PricingSource;
        courierBonusApplied: number;
    }>;
    unassignCourier(user: JwtUser, orderIdOrNumber: string): Promise<{
        number: number;
        id: string;
        courierId: string | null;
        courierFee: number;
        assignedAt: Date | null;
        courierBonusApplied: number;
    } | {
        ok: boolean;
        message: string;
    }>;
    autoAssignCourier(user: JwtUser, orderIdOrNumber: string): Promise<{
        number: number;
        id: string;
        courierId: string | null;
        courierFee: number;
        assignedAt: Date | null;
        pricingSource: import("@prisma/client").$Enums.PricingSource;
        courierBonusApplied: number;
    } | {
        ok: boolean;
        message: string;
        courierId: string;
    }>;
    private pickBestCourier;
}
export {};
