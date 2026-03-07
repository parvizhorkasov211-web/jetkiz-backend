export type JwtUser = {
    id: string;
    role?: 'CLIENT' | 'ADMIN' | 'COURIER' | 'RESTAURANT';
    restaurantId?: string;
    courierId?: string | null;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
