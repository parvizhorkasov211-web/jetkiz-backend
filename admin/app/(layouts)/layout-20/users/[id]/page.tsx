'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Segment = 'NEW' | 'REGULAR' | 'VIP';

type Customer = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt?: string;
};

type RestaurantMini = { id: string; title?: string; name?: string; nameRu?: string; nameKk?: string };

type OrderRow = {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;

  // бывает по-разному: или restaurantId, или restaurant объект
  restaurantId?: string | null;
  restaurant?: Partial<RestaurantMini> | null;

  ratingGiven: boolean;
};

type Metrics = {
  userId: string;
  segment: Segment;

  totalOrders: number;
  deliveredCount: number;
  canceledCount: number;

  paidCount: number;
  totalPaid: number;
  totalDelivered?: number;
  avgCheckPaid?: number;
  avgCheckDelivered?: number;

  totalSpent: number;
  avgCheck?: number;

  firstOrderDate?: string | null;
  lastOrderDate?: string | null;
  daysSinceLastOrder: number | null;

  lastOrder?: null | {
    id: string;
    createdAt: string;
    total: number;
    status: string;
    restaurantId: string;
    paymentStatus: string;
    paymentMethod: string;
  };

  loyalty?: { score: number; level: string };

  favoriteRestaurants?: { restaurantId: string; ordersCount: number }[];
  preferredTimeRange?: string | null;

  reviewsCount?: number;
  avgRating?: number | null;

  rates?: {
    cancelRatePercent?: number;
    paidRatePercent?: number;
    deliveredRatePercent?: number;
  };

  frequency?: {
    ordersPerWeek?: number;
    ordersPerMonth?: number;
  };

  customerTenureDays?: number;

  activity?: {
    isActive7?: boolean;
    isActive30?: boolean;
  };

  rfm?: {
    status?: string;
    totalSpent?: number;
    totalOrders?: number;
    recencyDays?: number | null;
  };
};

type ReviewItem = {
  id: string;
  orderId: string;
  restaurantId: string;
  productId: string | null;
  rating: number;
  text: string | null;
  createdAt: string;
};

type ReviewsResponse = {
  items: ReviewItem[];
  meta: { total: number; page: number; limit: number };
};

function fullName(c: Customer) {
  const fn = (c.firstName || '').trim();
  const ln = (c.lastName || '').trim();
  const s = `${fn} ${ln}`.trim();
  return s || '-';
}

function segmentLabel(s: Segment) {
  if (s === 'NEW') return 'Первичный';
  if (s === 'VIP') return 'VIP';
  return 'Постоянный';
}

function segmentBadgeClass(s: Segment) {
  if (s === 'NEW') return 'badge badge-light-warning';
  if (s === 'VIP') return 'badge badge-light-success';
  return 'badge badge-light-primary';
}

function orderStatusRu(s: string) {
  switch (s) {
    case 'CREATED':
      return 'Создан';
    case 'PAID':
      return 'Оплачен';
    case 'ACCEPTED':
      return 'Принят';
    case 'COOKING':
      return 'Готовится';
    case 'READY':
      return 'Готов';
    case 'ON_THE_WAY':
      return 'В пути';
    case 'DELIVERED':
      return 'Доставлен';
    case 'CANCELED':
      return 'Отменён';
    default:
      return s || '-';
  }
}

function stars(n: number) {
  const x = Math.max(0, Math.min(5, Math.floor(n || 0)));
  return '★★★★★'.slice(0, x) + '☆☆☆☆☆'.slice(0, 5 - x);
}

function clampText(s: string, max = 70) {
  const t = (s || '').trim();
  if (!t) return '';
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function rfmBadgeClass(status?: string) {
  switch (status) {
    case 'Топ-клиент':
      return 'badge badge-light-success';
    case 'Постоянный':
      return 'badge badge-light-primary';
    case 'Перспективный':
      return 'badge badge-light-info';
    case 'Рискуем потерять':
      return 'badge badge-light-warning';
    case 'Спящий':
      return 'badge badge-light-danger';
    case 'Новый':
    default:
      return 'badge badge-light-secondary';
  }
}

async function apiGet<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: 'include' });
  const text = await r.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!r.ok) throw new Error(data?.message || text || `HTTP ${r.status}`);
  return data as T;
}

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersLimit = 20;

  const [favRestaurants, setFavRestaurants] = useState<
    { restaurantId: string; title: string; ordersCount: number }[]
  >([]);

  // ✅ мапа названий ресторанов для таблицы заказов
  const [restaurantsMap, setRestaurantsMap] = useState<Record<string, string>>({});

  const [reviewsByOrderId, setReviewsByOrderId] = useState<Record<string, ReviewItem>>({});

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ordersQuery = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(ordersPage));
    sp.set('limit', String(ordersLimit));
    return sp.toString();
  }, [ordersPage]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    Promise.all([
      apiGet<Customer>(`${API_URL}/users/customers/${id}`),
      apiGet<{ items: OrderRow[]; meta: { total: number } }>(
        `${API_URL}/users/customers/${id}/orders?${ordersQuery}`,
      ),
      apiGet<Metrics>(`${API_URL}/users/clients/${id}/metrics`),
      apiGet<ReviewsResponse>(`${API_URL}/users/customers/${id}/reviews?page=1&limit=200`),
    ])
      .then(async ([c, o, m, rv]) => {
        if (!alive) return;

        setCustomer(c);
        const orderItems = o.items || [];
        setOrders(orderItems);
        setOrdersTotal(o.meta?.total || 0);
        setMetrics(m);

        // отзывы по orderId
        const map: Record<string, ReviewItem> = {};
        for (const it of rv.items || []) {
          if (it.orderId) map[it.orderId] = it;
        }
        setReviewsByOrderId(map);

        // ✅ Собираем ВСЕ restaurantId из заказов и подтягиваем названия
        const orderRestaurantIds = Array.from(
          new Set(
            orderItems
              .map((x) => (x.restaurantId || x.restaurant?.id || '') as string)
              .filter(Boolean),
          ),
        );

        // плюс любимые рестораны
        const fav = m.favoriteRestaurants || [];
        const favIds = fav.map((x) => x.restaurantId).filter(Boolean);
        const allRestaurantIds = Array.from(new Set([...orderRestaurantIds, ...favIds]));

        if (allRestaurantIds.length > 0) {
          const results = await Promise.all(
            allRestaurantIds.map(async (rid) => {
              try {
                const r = await apiGet<RestaurantMini>(`${API_URL}/restaurants/${rid}`);
                const title = (r.title || r.nameRu || r.name || r.nameKk || r.id || rid).toString();
                return { rid, title };
              } catch {
                return { rid, title: rid };
              }
            }),
          );

          if (!alive) return;

          const dict: Record<string, string> = {};
          for (const x of results) dict[x.rid] = x.title;

          setRestaurantsMap(dict);

          // ✅ Формируем блок ТОП-3 любимых ресторанов уже с названиями
          const favView = fav
            .slice(0, 3)
            .map((x) => ({
              restaurantId: x.restaurantId,
              title: dict[x.restaurantId] || x.restaurantId,
              ordersCount: x.ordersCount,
            }));

          setFavRestaurants(favView);
        } else {
          setRestaurantsMap({});
          setFavRestaurants([]);
        }
      })
      .catch((e: any) => {
        if (!alive) return;
        setErr(e?.message || 'Ошибка загрузки');
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [id, ordersQuery]);

  const ordersPages = Math.max(1, Math.ceil(ordersTotal / ordersLimit));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn" onClick={() => router.back()}>
          Назад
        </button>
        <h1 className="text-lg font-semibold">Клиент</h1>
        {loading && <div className="text-sm opacity-70">Загрузка...</div>}
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {customer && metrics && (
        <div className="rounded-xl border p-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black/10 overflow-hidden">
                {customer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={customer.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{fullName(customer)}</div>
                  <span className={segmentBadgeClass(metrics.segment)}>{segmentLabel(metrics.segment)}</span>
                  {metrics.rfm?.status ? (
                    <span className={rfmBadgeClass(metrics.rfm.status)}>{metrics.rfm.status}</span>
                  ) : null}
                </div>
                <div className="text-sm opacity-70">Тел: {customer.phone}</div>
              </div>
            </div>

            <div className="text-sm opacity-70">
              {customer.createdAt ? (
                <>
                  Регистрация:{' '}
                  <span className="text-black">{new Date(customer.createdAt).toLocaleString()}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70">Лояльность</div>
              <div className="text-lg font-semibold">
                {(metrics.loyalty?.level ?? '—') + ' (' + (metrics.loyalty?.score ?? 0) + ')'}
              </div>
              <div className="text-xs opacity-70">Сегмент + выполненные/оплаченные + давность</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70">Статус клиента</div>
              <div className="text-lg font-semibold">{metrics.rfm?.status ?? '—'}</div>
              <div className="text-xs opacity-70">Потрачено: {metrics.totalSpent ?? 0} ₸</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70">Рейтинг клиента</div>
              <div className="text-lg font-semibold">
                {metrics.avgRating == null ? (
                  '—'
                ) : (
                  <>
                    {stars(metrics.avgRating)} <span className="opacity-70">({metrics.avgRating.toFixed(1)})</span>
                  </>
                )}
              </div>
              <div className="text-xs opacity-70">Отзывов: {metrics.reviewsCount ?? 0}</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70">Оплачено всего</div>
              <div className="text-lg font-semibold">{metrics.totalPaid ?? 0} ₸</div>
              <div className="text-xs opacity-70">Оплачено заказов: {metrics.paidCount ?? 0}</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70">Средний чек (оплачено)</div>
              <div className="text-lg font-semibold">{metrics.avgCheckPaid ?? 0} ₸</div>
              <div className="text-xs opacity-70">По доставленным: {metrics.avgCheckDelivered ?? 0} ₸</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70">Всего заказов</div>
              <div className="text-lg font-semibold">{metrics.totalOrders ?? 0}</div>
              <div className="text-xs opacity-70">С последнего: {metrics.daysSinceLastOrder ?? '-'} дн.</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70">Отменено</div>
              <div className="text-lg font-semibold">{metrics.canceledCount ?? 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70 mb-2">Любимые рестораны (ТОП-3)</div>
              {favRestaurants.length === 0 ? (
                <div className="text-sm opacity-70">Пока нет данных</div>
              ) : (
                <div className="space-y-1">
                  {favRestaurants.map((x) => (
                    <div key={x.restaurantId} className="flex items-center justify-between text-sm">
                      <div className="truncate">{x.title}</div>
                      <div className="opacity-70">{x.ordersCount} заказ(а)</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm opacity-70 mb-2">Предпочтительное время заказов</div>
              {metrics.preferredTimeRange ? (
                <div className="text-lg font-semibold">{metrics.preferredTimeRange}</div>
              ) : (
                <div className="text-sm opacity-70">Появится после 3 заказов</div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border p-4">
        <div className="font-semibold mb-3">Заказы</div>

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Дата</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Оплата</th>
                <th className="text-left p-3">Сумма</th>
                <th className="text-left p-3">Ресторан</th>
                <th className="text-left p-3">Отзыв</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => {
                const rv = reviewsByOrderId[o.id];

                const rid = (o.restaurantId || o.restaurant?.id || '') as string;
                const restaurantTitle =
                  (rid && restaurantsMap[rid]) ||
                  (o.restaurant?.nameRu || o.restaurant?.name || o.restaurant?.nameKk || '') ||
                  rid ||
                  '-';

                return (
                  <tr
                    key={o.id}
                    className="border-t cursor-pointer hover:bg-black/5"
                    onClick={() => router.push(`/layout-20/orders/${o.id}`)}
                    title="Открыть заказ"
                  >
                    <td className="p-3">{o.id}</td>
                    <td className="p-3">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="p-3">{orderStatusRu(o.status)}</td>
                    <td className="p-3">
                      {o.paymentStatus ? o.paymentStatus : '-'} / {o.paymentMethod ? o.paymentMethod : '-'}
                    </td>
                    <td className="p-3">{o.total} ₸</td>
                    <td className="p-3">{restaurantTitle}</td>
                    <td className="p-3">
                      {o.status !== 'DELIVERED' ? (
                        <span className="opacity-70">—</span>
                      ) : rv ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold">
                            {stars(rv.rating)} <span className="opacity-70">({rv.rating})</span>
                          </div>
                          {rv.text ? (
                            <div className="text-xs opacity-80">{clampText(rv.text, 80)}</div>
                          ) : (
                            <div className="text-xs opacity-60">Без текста</div>
                          )}
                        </div>
                      ) : (
                        <span className="opacity-70">Нет</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {orders.length === 0 && (
                <tr>
                  <td className="p-6 opacity-70" colSpan={7}>
                    Нет заказов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button className="btn" disabled={ordersPage <= 1} onClick={() => setOrdersPage((p) => p - 1)}>
            Назад
          </button>
          <div className="text-sm">
            {ordersPage} / {ordersPages}
          </div>
          <button className="btn" disabled={ordersPage >= ordersPages} onClick={() => setOrdersPage((p) => p + 1)}>
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
}
