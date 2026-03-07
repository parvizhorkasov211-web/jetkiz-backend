'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type FinancePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'custom';
type ApiFinancePeriod = 'today' | 'yesterday' | '7d' | '30d';

type FinanceSummary = {
  period: {
    key?: ApiFinancePeriod;
    start: string;
    end: string;
  };
  ordersToday: number;
  ordersDeliveredToday: number;
  subtotalToday: number;
  deliveryFeesToday: number;
  discountsToday: number;
  deliveryDiscountsToday: number;
  gmvToday: number;
  netCollectedToday: number;
  courierPayoutsToday: number;
  courierFeeGrossToday: number;
  courierCommissionToday: number;
  restaurantCommissionToday: number;
  restaurantPayoutsToday: number;
  avgOrderValueToday: number;
};

type RestaurantPayoutSummary = {
  period: {
    key?: ApiFinancePeriod;
    start: string;
    end: string;
  };
  totals: {
    restaurantsCount: number;
    deliveredOrdersCount: number;
    grossSubtotal: number;
    commissionAmount: number;
    accruedPayoutAmount: number;
    alreadyAssignedToPayoutAmount: number;
    pendingPayoutAmount: number;
    paidPayoutAmount: number;
    unpaidButAssignedAmount: number;
  };
  restaurants: Array<{
    restaurant: {
      id: string;
      nameRu: string;
      nameKk: string;
      slug: string;
      number: number;
    };
    deliveredOrdersCount: number;
    grossSubtotal: number;
    commissionAmount: number;
    accruedPayoutAmount: number;
    alreadyAssignedToPayoutAmount: number;
    pendingPayoutAmount: number;
    paidPayoutAmount: number;
    unpaidButAssignedAmount: number;
    lastDeliveredAt: string | null;
    lastPaidAt: string | null;
    payouts: Array<{
      id: string;
      periodFrom: string;
      periodTo: string;
      ordersCount: number;
      grossSubtotal: number;
      commissionAmount: number;
      payoutAmount: number;
      status: string;
      paidAt: string | null;
      note: string | null;
      createdAt: string;
    }>;
  }>;
};

type CourierPayoutSummary = {
  period: {
    key?: ApiFinancePeriod;
    start: string;
    end: string;
  };
  cutoffHour?: number;
  totals: {
    couriersCount: number;
    deliveredOrdersCount: number;
    courierFeeGrossAmount: number;
    commissionAmount: number;
    accruedPayoutAmount: number;
    alreadyAssignedToPayoutAmount: number;
    pendingPayoutAmount: number;
    paidPayoutAmount: number;
    unpaidButAssignedAmount: number;
  };
  couriers: Array<{
    courier: {
      userId: string;
      firstName: string | null;
      lastName: string | null;
      phone?: string | null;
    };
    deliveredOrdersCount: number;
    courierFeeGrossAmount: number;
    commissionAmount: number;
    accruedPayoutAmount: number;
    alreadyAssignedToPayoutAmount: number;
    pendingPayoutAmount: number;
    paidPayoutAmount: number;
    unpaidButAssignedAmount: number;
    lastDeliveredAt: string | null;
    lastPaidAt: string | null;
  }>;
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jetkiz_admin_token');
}

function formatMoney(value: number) {
  return `${value.toLocaleString('ru-RU')} ₸`;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

function formatDateOnly(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
}

type AccentCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  gradient: string;
  onClick?: () => void;
};

function AccentCard({
  title,
  value,
  subtitle,
  badge,
  gradient,
  onClick,
}: AccentCardProps) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-3.5 text-left text-white shadow-sm ${
        onClick ? 'transition-all hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${gradient}`}
    >
      <div className="absolute right-3 top-3 rounded-xl bg-white/15 px-2 py-1 text-[10px] font-semibold backdrop-blur-sm">
        {badge ?? title}
      </div>

      <div className="pr-14">
        <div className="text-[14px] font-semibold leading-5 text-white/90">
          {title}
        </div>
        <div className="mt-2.5 text-[34px] font-bold leading-none">{value}</div>
        {subtitle ? (
          <div className="mt-2 text-[12px] leading-4 text-white/80">
            {subtitle}
          </div>
        ) : null}
      </div>
    </Comp>
  );
}

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  valueClassName?: string;
  onClick?: () => void;
};

function MetricCard({
  title,
  value,
  subtitle,
  valueClassName = 'text-gray-900',
  onClick,
}: MetricCardProps) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md' : 'hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div className="text-[13px] font-semibold leading-4 text-gray-500">
        {title}
      </div>
      <div className={`mt-1.5 text-[30px] font-bold leading-none ${valueClassName}`}>
        {value}
      </div>
      {subtitle ? (
        <div className="mt-1.5 text-[12px] leading-4 text-gray-400">{subtitle}</div>
      ) : null}
    </Comp>
  );
}

type SectionProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
};

function Section({ title, subtitle, children, rightSlot }: SectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[22px] font-bold leading-6 text-gray-900">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[13px] leading-5 text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        {rightSlot}
      </div>

      <div className="p-3.5">{children}</div>
    </div>
  );
}

const PERIOD_OPTIONS: Array<{ key: FinancePeriod; label: string }> = [
  { key: 'today', label: 'Сегодня' },
  { key: 'yesterday', label: 'Вчера' },
  { key: '7d', label: '7 дней' },
  { key: '30d', label: '30 дней' },
];

export default function AnalyticsPage() {
  const router = useRouter();

  const [data, setData] = useState<FinanceSummary | null>(null);
  const [restaurantData, setRestaurantData] =
    useState<RestaurantPayoutSummary | null>(null);
  const [courierData, setCourierData] = useState<CourierPayoutSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<FinancePeriod>('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const buildHeaders = () => {
    const token = getToken();

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-dev-user-id': 'dev-admin',
      'x-dev-role': 'ADMIN',
    };
  };

  const fetchJson = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      let message = `Ошибка загрузки: ${res.status}`;
      try {
        const json = await res.json();
        message =
          typeof json?.message === 'string'
            ? json.message
            : Array.isArray(json?.message)
              ? json.message.join(', ')
              : message;
      } catch {}
      throw new Error(message);
    }

    return res.json();
  };

  const buildPeriodQuery = (
    nextPeriod: FinancePeriod,
    customFrom: string,
    customTo: string,
  ) => {
    const params = new URLSearchParams();

    params.set('period', nextPeriod);

    if (nextPeriod === 'custom') {
      if (customFrom) params.set('from', customFrom);
      if (customTo) params.set('to', customTo);
    }

    return params.toString();
  };

  const openFinanceDetails = (
  entity: 'restaurants' | 'couriers',
  scope: 'pending' | 'assigned' | 'paid' | 'all',
) => {
  const query = buildPeriodQuery(period, fromDate, toDate);
  const base =
    entity === 'restaurants'
      ? '/layout-20/payouts/restaurants'
      : '/layout-20/payouts/couriers';

  router.push(`${base}?scope=${scope}&${query}`);
};

  const loadAnalytics = async (
    nextPeriod: FinancePeriod = period,
    customFrom: string = fromDate,
    customTo: string = toDate,
  ) => {
    try {
      setLoading(true);
      setError(null);

      let financeUrl = `http://localhost:3001/finance/summary?period=${nextPeriod}`;
      let restaurantUrl = `http://localhost:3001/finance/restaurant-payouts/summary?period=${
        nextPeriod === 'custom' ? '30d' : nextPeriod
      }`;
      let courierUrl = `http://localhost:3001/finance/courier-payouts/summary?period=${
        nextPeriod === 'custom' ? '30d' : nextPeriod
      }`;

      if (nextPeriod === 'custom') {
        if (!customFrom || !customTo) {
          throw new Error('Выбери обе даты: с и по');
        }

        financeUrl += `&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
        restaurantUrl += `&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
        courierUrl += `&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
      }

      const [financeJson, restaurantJson, courierJson] = await Promise.all([
        fetchJson<FinanceSummary>(financeUrl),
        fetchJson<RestaurantPayoutSummary>(restaurantUrl),
        fetch(courierUrl, {
          method: 'GET',
          headers: buildHeaders(),
          cache: 'no-store',
        })
          .then(async (res) => {
            if (res.status === 404) return null;
            if (!res.ok) {
              let message = `Ошибка загрузки: ${res.status}`;
              try {
                const json = await res.json();
                message =
                  typeof json?.message === 'string'
                    ? json.message
                    : Array.isArray(json?.message)
                      ? json.message.join(', ')
                      : message;
              } catch {}
              throw new Error(message);
            }
            return (await res.json()) as CourierPayoutSummary;
          }),
      ]);

      setData(financeJson);
      setRestaurantData(restaurantJson);
      setCourierData(courierJson);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom') {
      loadAnalytics(period);
    }
  }, [period]);

  const currentPeriodLabel = useMemo(() => {
    if (period === 'custom') return 'Произвольный диапазон';
    return PERIOD_OPTIONS.find((item) => item.key === period)?.label ?? 'Период';
  }, [period]);

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h1 className="text-[28px] font-bold leading-8 text-gray-900">
                Финансовая аналитика
              </h1>
              <p className="mt-2 text-[13px] leading-5 text-gray-500">
                Только доставленные заказы. Период аналитики должен считаться по
                deliveredAt. Статусы выплат ресторанов и курьеров — отдельными
                блоками.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Период
                </div>
                <div className="mt-2 text-[20px] font-bold leading-6 text-gray-900">
                  {currentPeriodLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Интервал
                </div>
                <div className="mt-2 text-[14px] font-semibold leading-5 text-gray-900">
                  {data
                    ? `${formatDateOnly(data.period.start)} — ${formatDateOnly(data.period.end)}`
                    : '—'}
                </div>
              </div>
            </div>

            {data ? (
              <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="text-[13px] font-semibold leading-5 text-emerald-700">
                  Общая аналитика должна считать только доставленные заказы
                </div>
                <div className="mt-1 text-[12px] leading-5 text-emerald-600">
                  Для выплат курьерам и ресторанам день расчёта по правилу 23:00
                  должен определяться backend. Если заказ доставили позже, он должен
                  попасть уже в следующий расчётный день.
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[15px] font-bold text-gray-900">
                  Быстрый выбор периода
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PERIOD_OPTIONS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPeriod(item.key)}
                      className={`rounded-2xl px-4 py-2.5 text-[14px] font-semibold transition-all ${
                        period === item.key
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => loadAnalytics(period)}
                    className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-700 transition-all hover:bg-gray-100"
                  >
                    Обновить
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="w-full lg:max-w-[220px]">
                    <label className="mb-2 block text-[13px] font-semibold text-gray-600">
                      С даты
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-all focus:border-emerald-400"
                    />
                  </div>

                  <div className="w-full lg:max-w-[220px]">
                    <label className="mb-2 block text-[13px] font-semibold text-gray-600">
                      По дату
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-all focus:border-emerald-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriod('custom');
                      loadAnalytics('custom', fromDate, toDate);
                    }}
                    className="rounded-2xl bg-gray-900 px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-black"
                  >
                    Показать
                  </button>
                </div>

                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-5 text-blue-700">
                  Кастомный период уже передаётся в summary. Для точного расчётного
                  дня по правилу 23:00 backend должен возвращать payout summary с
                  учётом cutoff-логики.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-[14px] text-gray-600 shadow-sm">
          Загрузка аналитики...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <AccentCard
              title="GMV"
              value={formatMoney(data.gmvToday)}
              subtitle="Subtotal + доставка по доставленным заказам"
              badge="Оборот"
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <AccentCard
              title="Собрано денег"
              value={formatMoney(data.netCollectedToday)}
              subtitle="Фактически собранная сумма по доставленным заказам"
              badge="Деньги"
              gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
            />
            <AccentCard
              title="Доставлено"
              value={data.ordersDeliveredToday}
              subtitle={`Заказов в аналитике: ${data.ordersToday}`}
              badge="Заказы"
              gradient="bg-gradient-to-br from-indigo-500 to-blue-700"
            />
            <AccentCard
              title="Средний чек"
              value={formatMoney(data.avgOrderValueToday)}
              subtitle="Net collected / delivered orders"
              badge="AOV"
              gradient="bg-gradient-to-br from-orange-500 to-rose-500"
            />
          </div>

          <Section
            title="Общая по заказам"
            subtitle="Базовая структура суммы доставленных заказов за период"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Сумма блюд"
                value={formatMoney(data.subtotalToday)}
                subtitle="Общий subtotal доставленных заказов"
              />
              <MetricCard
                title="Доставка"
                value={formatMoney(data.deliveryFeesToday)}
                subtitle="Сумма delivery fee"
              />
              <MetricCard
                title="Скидки на блюда"
                value={formatMoney(data.discountsToday)}
                subtitle="Промокоды и скидки на товары"
                valueClassName="text-rose-600"
              />
              <MetricCard
                title="Скидки на доставку"
                value={formatMoney(data.deliveryDiscountsToday)}
                subtitle="Скидки на delivery fee"
                valueClassName="text-rose-600"
              />
            </div>
          </Section>

          <Section
            title="Курьеры"
            subtitle="Отдельно курьерские суммы: gross, комиссия сервиса и чистая выплата"
            rightSlot={
              <button
                type="button"
                onClick={() => openFinanceDetails('couriers', 'all')}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                Открыть выплаты курьеров
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                title="Курьер gross"
                value={formatMoney(data.courierFeeGrossToday)}
                subtitle="Полная стоимость доставки до удержания комиссии"
              />
              <MetricCard
                title="Комиссия с курьеров"
                value={formatMoney(data.courierCommissionToday)}
                subtitle="Удержание сервиса с курьерской части"
                valueClassName="text-amber-600"
              />
              <MetricCard
                title="Курьерам начислено"
                value={formatMoney(data.courierPayoutsToday)}
                subtitle="Чистая сумма начислений курьерам за период"
                valueClassName="text-emerald-600"
              />
            </div>
          </Section>

          <Section
            title="Рестораны"
            subtitle="Отдельно ресторанские суммы: комиссия сервиса и начисления ресторанам"
            rightSlot={
              <button
                type="button"
                onClick={() => openFinanceDetails('restaurants', 'all')}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                Открыть выплаты ресторанов
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
              <MetricCard
                title="Комиссия ресторанов"
                value={formatMoney(data.restaurantCommissionToday ?? 0)}
                subtitle="Сколько сервис удержал с ресторанов"
                valueClassName="text-violet-600"
              />
              <MetricCard
                title="Ресторанам начислено"
                value={formatMoney(data.restaurantPayoutsToday ?? 0)}
                subtitle="Сумма к начислению ресторанам за период"
                valueClassName="text-emerald-600"
              />
            </div>
          </Section>

          <Section
            title="Статус расчётов с ресторанами"
            subtitle="Pending / assigned / paid по ресторанам"
            rightSlot={
              <button
                type="button"
                onClick={() => openFinanceDetails('restaurants', 'all')}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                Смотреть подробно
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                title="К выплате ресторанам"
                value={formatMoney(
                  restaurantData?.totals.pendingPayoutAmount ?? 0,
                )}
                subtitle="Delivered заказы без restaurantPayoutId"
                valueClassName="text-orange-600"
                onClick={() => openFinanceDetails('restaurants', 'pending')}
              />
              <MetricCard
                title="Назначено, но не оплачено"
                value={formatMoney(
                  restaurantData?.totals.unpaidButAssignedAmount ?? 0,
                )}
                subtitle="Уже в payout, но статус ещё не PAID"
                valueClassName="text-blue-600"
                onClick={() => openFinanceDetails('restaurants', 'assigned')}
              />
              <MetricCard
                title="Уже выплачено ресторанам"
                value={formatMoney(restaurantData?.totals.paidPayoutAmount ?? 0)}
                subtitle="Payout со статусом PAID"
                valueClassName="text-emerald-600"
                onClick={() => openFinanceDetails('restaurants', 'paid')}
              />
            </div>
          </Section>

          <Section
            title="Статус расчётов с курьерами"
            subtitle="Pending / assigned / paid по курьерам. Для точности нужен backend courier payouts summary"
            rightSlot={
              <button
                type="button"
                onClick={() => openFinanceDetails('couriers', 'all')}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                Смотреть подробно
              </button>
            }
          >
            {courierData ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  title="К выплате курьерам"
                  value={formatMoney(courierData.totals.pendingPayoutAmount)}
                  subtitle="Delivered заказы без courier payout assignment"
                  valueClassName="text-orange-600"
                  onClick={() => openFinanceDetails('couriers', 'pending')}
                />
                <MetricCard
                  title="Назначено, но не оплачено"
                  value={formatMoney(courierData.totals.unpaidButAssignedAmount)}
                  subtitle="Уже в payout, но статус ещё не PAID"
                  valueClassName="text-blue-600"
                  onClick={() => openFinanceDetails('couriers', 'assigned')}
                />
                <MetricCard
                  title="Уже выплачено курьерам"
                  value={formatMoney(courierData.totals.paidPayoutAmount)}
                  subtitle="Courier payout со статусом PAID"
                  valueClassName="text-emerald-600"
                  onClick={() => openFinanceDetails('couriers', 'paid')}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] leading-6 text-amber-800">
                Backend ещё не отдаёт <span className="font-bold">courier payouts summary</span>.
                Поэтому точный статус расчётов с курьерами по схеме
                pending / assigned / paid и по правилу расчётного дня 23:00 пока
                нельзя показать честно только фронтом.
              </div>
            )}
          </Section>
        </>
      ) : null}

      {restaurantData ? (
        <div className="rounded-[24px] border-2 border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-cyan-50/40 shadow-[0_10px_40px_rgba(59,130,246,0.08)]">
          <div className="flex flex-col gap-3 border-b border-indigo-100 px-5 py-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-indigo-700">
                Главный блок выплат
              </div>

              <h2 className="mt-3 text-[32px] font-extrabold leading-9 text-gray-900">
                Выплаты ресторанам
              </h2>

              <p className="mt-2 text-[16px] font-medium leading-6 text-gray-700">
                Здесь оператор должен сразу видеть три ключевые суммы:
                <span className="font-bold text-orange-600"> pending</span>,
                <span className="font-bold text-blue-600"> assigned</span> и
                <span className="font-bold text-emerald-600"> paid</span>.
              </p>

              <p className="mt-1 text-[14px] leading-6 text-gray-500">
                По каждому ресторану показаны оборот по блюдам, комиссия сервиса,
                сумма к выплате сейчас, уже выплаченные суммы и суммы, которые
                уже включены в payout, но ещё не подтверждены как paid.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-right shadow-sm">
                <div className="text-[13px] font-semibold text-gray-500">
                  Ресторанов в выборке
                </div>
                <div className="mt-1 text-[26px] font-extrabold leading-none text-indigo-700">
                  {restaurantData.totals.restaurantsCount}
                </div>
              </div>

              <button
                type="button"
                onClick={() => openFinanceDetails('restaurants', 'all')}
                className="shrink-0 rounded-2xl bg-gray-900 px-4 py-3 text-[14px] font-semibold text-white transition-all hover:bg-black"
              >
                Открыть раздел выплат
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-1">
                <AccentCard
                  title="Доставлено заказов"
                  value={restaurantData.totals.deliveredOrdersCount}
                  subtitle="Количество доставленных заказов за выбранный период"
                  badge="Orders"
                  gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
                />
              </div>

              <div className="xl:col-span-1">
                <AccentCard
                  title="Сумма блюд"
                  value={formatMoney(restaurantData.totals.grossSubtotal)}
                  subtitle="Subtotal доставленных заказов по всем ресторанам"
                  badge="Subtotal"
                  gradient="bg-gradient-to-br from-violet-600 to-fuchsia-600"
                />
              </div>

              <div className="xl:col-span-1">
                <AccentCard
                  title="Комиссия сервиса"
                  value={formatMoney(restaurantData.totals.commissionAmount)}
                  subtitle="Сколько сервис удержал с ресторанов"
                  badge="Commission"
                  gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                />
              </div>

              <div className="xl:col-span-1">
                <AccentCard
                  title="К выплате сейчас"
                  value={formatMoney(restaurantData.totals.pendingPayoutAmount)}
                  subtitle="Заказы без restaurantPayoutId, ещё не назначены в payout"
                  badge="Pending"
                  gradient="bg-gradient-to-br from-orange-500 to-rose-500"
                  onClick={() => openFinanceDetails('restaurants', 'pending')}
                />
              </div>

              <div className="xl:col-span-1">
                <AccentCard
                  title="В payout, не оплачено"
                  value={formatMoney(restaurantData.totals.unpaidButAssignedAmount)}
                  subtitle="Уже назначено в payout, но статус ещё не PAID"
                  badge="Assigned"
                  gradient="bg-gradient-to-br from-cyan-500 to-sky-600"
                  onClick={() => openFinanceDetails('restaurants', 'assigned')}
                />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div className="text-[20px] font-bold text-gray-900">
                  Детализация по ресторанам
                </div>
                <div className="mt-1 text-[14px] leading-6 text-gray-600">
                  Смотри сначала на колонки
                  <span className="font-bold text-orange-600"> «К выплате»</span>,
                  <span className="font-bold text-blue-600"> «В payout»</span> и
                  <span className="font-bold text-emerald-600"> «Уже выплачено»</span>.
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100 text-left">
                      <th className="px-5 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-gray-700">
                        Ресторан
                      </th>
                      <th className="px-4 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-gray-700">
                        Заказов
                      </th>
                      <th className="px-4 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-gray-700">
                        Сумма блюд
                      </th>
                      <th className="px-4 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-gray-700">
                        Комиссия
                      </th>
                      <th className="px-4 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-orange-700">
                        К выплате
                      </th>
                      <th className="px-4 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">
                        Уже выплачено
                      </th>
                      <th className="px-4 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-blue-700">
                        В payout
                      </th>
                      <th className="px-4 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-gray-700">
                        Последняя доставка
                      </th>
                      <th className="px-4 py-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-gray-700">
                        Последняя выплата
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {restaurantData.restaurants.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-8 text-center text-[15px] text-gray-500"
                        >
                          Нет данных по выплатам ресторанов за выбранный период
                        </td>
                      </tr>
                    ) : (
                      restaurantData.restaurants.map((row, index) => (
                        <tr
                          key={row.restaurant.id}
                          className={`border-b border-gray-100 transition-colors hover:bg-indigo-50/40 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <td className="px-5 py-4 align-top">
                            <div className="text-[17px] font-extrabold leading-6 text-gray-900">
                              {row.restaurant.nameRu || row.restaurant.nameKk}
                            </div>
                            <div className="mt-1 text-[13px] font-medium text-gray-500">
                              №{row.restaurant.number} · {row.restaurant.slug}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-[16px] font-bold text-gray-900">
                            {row.deliveredOrdersCount}
                          </td>

                          <td className="px-4 py-4 align-top text-[16px] font-bold text-gray-900">
                            {formatMoney(row.grossSubtotal)}
                          </td>

                          <td className="px-4 py-4 align-top text-[16px] font-bold text-violet-700">
                            {formatMoney(row.commissionAmount)}
                          </td>

                          <td className="px-4 py-4 align-top">
                            <button
                              type="button"
                              onClick={() => openFinanceDetails('restaurants', 'pending')}
                              className="inline-flex rounded-xl bg-orange-50 px-3 py-2 text-[16px] font-extrabold text-orange-700 ring-1 ring-orange-200 transition-all hover:bg-orange-100"
                            >
                              {formatMoney(row.pendingPayoutAmount)}
                            </button>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <button
                              type="button"
                              onClick={() => openFinanceDetails('restaurants', 'paid')}
                              className="inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-[16px] font-extrabold text-emerald-700 ring-1 ring-emerald-200 transition-all hover:bg-emerald-100"
                            >
                              {formatMoney(row.paidPayoutAmount)}
                            </button>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <button
                              type="button"
                              onClick={() => openFinanceDetails('restaurants', 'assigned')}
                              className="inline-flex rounded-xl bg-blue-50 px-3 py-2 text-[16px] font-extrabold text-blue-700 ring-1 ring-blue-200 transition-all hover:bg-blue-100"
                            >
                              {formatMoney(row.unpaidButAssignedAmount)}
                            </button>
                          </td>

                          <td className="px-4 py-4 align-top text-[14px] font-medium leading-5 text-gray-700">
                            {formatDate(row.lastDeliveredAt)}
                          </td>

                          <td className="px-4 py-4 align-top text-[14px] font-medium leading-5 text-gray-700">
                            {formatDate(row.lastPaidAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}