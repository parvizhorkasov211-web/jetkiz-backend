'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Suggestion = { type: 'warning' | 'info' | 'success'; title: string; text: string };

type Metrics = {
  restaurant?: {
    id: string;
    slug: string;
    nameRu: string;
    nameKk: string;
    status: string;
  };
  period?: { from: string; to: string; days: number };

  totalOrders?: number;
  deliveredCount?: number;
  canceledCount?: number;
  paidCount?: number;

  revenue?: { totalPaid: number; totalDelivered: number; totalRevenue: number };
  avgCheckRevenue?: number;
  trendRevenuePercent?: number | null;

  rates?: { cancelRatePercent: number; paidRatePercent: number; deliveredRatePercent: number };

  customers?: {
    activeCustomers: number;
    activeCustomers7d: number;
    activeCustomers30d: number;
    newCustomers: number;
    repeatRatePercent: number;
    rfmDistribution: Record<string, number>;
  };

  reviews?: { ratingAvg: number | null; reviewsCount: number; reviewRatePercent: number };

  daily?: { date: string; orders: number; delivered: number; canceled: number; paid: number; revenue: number }[];

  topClients?: {
    userId: string;
    phone: string | null;
    name: string | null;
    ordersCount: number;
    spent: number;
    lastOrderAt: string | null;
    recencyDays: number | null;
    status: string;
  }[];

  recentOrders?: {
    id: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    total: number;
    userId: string;
    userName: string | null;
    userPhone: string | null;
  }[];

  suggestions?: Suggestion[];
};

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

function fmtMoney(n: number | undefined | null) {
  const x = Math.round(Number(n ?? 0));
  return `${x.toLocaleString('ru-RU')} ₸`;
}

function fmtDateTime(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleString('ru-RU');
}

function toYmdLocalInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function badgeBySuggestionType(t: Suggestion['type']) {
  if (t === 'warning') return 'badge badge-light-danger';
  if (t === 'success') return 'badge badge-light-success';
  return 'badge badge-light-primary';
}

function statusBadge(status: string) {
  const s = String(status || '').toUpperCase();
  if (s.includes('CANCEL')) return 'badge badge-light-danger';
  if (s.includes('DELIVER')) return 'badge badge-light-success';
  if (s.includes('PAID')) return 'badge badge-light-success';
  if (s.includes('FAIL')) return 'badge badge-light-danger';
  if (s.includes('CREAT') || s.includes('NEW')) return 'badge badge-light-primary';
  return 'badge badge-light-warning';
}

function levelColor(t: number) {
  if (t <= 0.33) return 'rgba(220, 38, 38, 0.95)'; // красный
  if (t <= 0.66) return 'rgba(245, 158, 11, 0.95)'; // желтый
  return 'rgba(34, 197, 94, 0.95)'; // зеленый
}

/**
 * ✅ Определяем активный пресет по from/to:
 * - активен только если to = сегодня
 * - и from = сегодня - 7/30/90
 */
function detectPreset(from: string, to: string): 7 | 30 | 90 | null {
  if (!from || !to) return null;

  const today = new Date();
  const toExpected = toYmdLocalInput(today);
  if (to !== toExpected) return null;

  const ms = today.getTime();
  const f7 = toYmdLocalInput(new Date(ms - 7 * 86400000));
  const f30 = toYmdLocalInput(new Date(ms - 30 * 86400000));
  const f90 = toYmdLocalInput(new Date(ms - 90 * 86400000));

  if (from === f7) return 7;
  if (from === f30) return 30;
  if (from === f90) return 90;
  return null;
}

/**
 * ✅ Улучшенный график:
 * - Tooltip у мышки с датой + значением
 * - Подсветка точки
 * - Нормальная зона наведения по всему графику
 */
function NiceLineChart({
  title,
  subtitle,
  data,
  valueKey,
  valueSuffix,
  height = 180,
  formatValue,
}: {
  title: string;
  subtitle?: string;
  data: { date: string; [k: string]: any }[];
  valueKey: string;
  valueSuffix?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const width = 980;
  const padL = 14;
  const padR = 52; // справа цифры
  const padT = 14;
  const padB = 28; // снизу даты

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const values = (data || []).map((d) => Number(d?.[valueKey] || 0));
  const max = Math.max(1, ...values);
  const min = 0;

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const points = values.map((v, i) => {
    const x = padL + (i * plotW) / Math.max(1, values.length - 1);
    const y = padT + ((max - v) * plotH) / Math.max(1, max - min);
    const t = max > 0 ? v / max : 0;
    return { x, y, v, t, i };
  });

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const last = points[points.length - 1]?.v ?? 0;

  const ticks = [0, 0.33, 0.66, 1].map((t) => {
    const y = padT + (1 - t) * plotH;
    const v = Math.round(max * t);
    return { t, y, v };
  });

  const xLabelEvery = Math.max(1, Math.ceil((data?.length || 1) / 8));

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const valueToText = (v: number) => {
    if (formatValue) return formatValue(v);
    return `${v.toLocaleString('ru-RU')}${valueSuffix || ''}`;
  };

  const dateToText = (ymd: string) => {
    // ymd "YYYY-MM-DD"
    try {
      const [Y, M, D] = ymd.split('-').map(Number);
      if (!Y || !M || !D) return ymd;
      const dt = new Date(Y, M - 1, D);
      return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt);
    } catch {
      return ymd;
    }
  };

  const onMove = (e: React.MouseEvent) => {
    if (!wrapRef.current || points.length === 0) return;

    const rect = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const scrollLeft = wrapRef.current.scrollLeft || 0;
    const mxSvg = mx + scrollLeft;

    // ищем ближайшую точку по X
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - mxSvg);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    setHoverIdx(best);
    setTip({ x: mx, y: my });
  };

  const onLeave = () => {
    setHoverIdx(null);
    setTip(null);
  };

  const hoverPoint = hoverIdx != null ? points[hoverIdx] : null;
  const hoverData = hoverIdx != null ? data?.[hoverIdx] : null;

  const tooltipText =
    hoverPoint && hoverData
      ? {
          date: dateToText(String(hoverData.date || '')),
          value: valueToText(Number(hoverPoint.v || 0)),
        }
      : null;

  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs opacity-70 mt-1">{subtitle}</div> : null}
        </div>
        <div className="text-sm opacity-70">
          Последнее:{' '}
          <span className="text-black font-semibold">{valueToText(last)}</span>
        </div>
      </div>

      {/* ✅ Обёртка для tooltip (position: relative) */}
      <div
        ref={wrapRef}
        className="overflow-auto"
        style={{ position: 'relative' }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <svg width={width} height={height} className="block">
          {/* grid */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line x1={padL} y1={t.y} x2={width - padR} y2={t.y} stroke="rgba(0,0,0,0.08)" />
              <text x={width - padR + 8} y={t.y + 4} fontSize="11" fill="rgba(0,0,0,0.55)">
                {t.v.toLocaleString('ru-RU')}
              </text>
            </g>
          ))}

          {/* axis */}
          <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="rgba(0,0,0,0.12)" />
          <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="rgba(0,0,0,0.12)" />

          {/* line */}
          <path d={path} fill="none" stroke="rgba(0,0,0,0.75)" strokeWidth="2.2" />

          {/* points */}
          {points.map((p) => (
            <circle
              key={p.i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === p.i ? 5.2 : 3.2}
              fill={levelColor(p.t)}
              stroke="rgba(0,0,0,0.12)"
            />
          ))}

          {/* hover crosshair */}
          {hoverPoint ? (
            <g>
              <line
                x1={hoverPoint.x}
                y1={padT}
                x2={hoverPoint.x}
                y2={height - padB}
                stroke="rgba(0,0,0,0.10)"
                strokeDasharray="4 4"
              />
              <line
                x1={padL}
                y1={hoverPoint.y}
                x2={width - padR}
                y2={hoverPoint.y}
                stroke="rgba(0,0,0,0.10)"
                strokeDasharray="4 4"
              />
            </g>
          ) : null}

          {/* x labels */}
          {(data || []).map((d, i) => {
            if (i % xLabelEvery !== 0 && i !== data.length - 1) return null;
            const x = padL + (i * plotW) / Math.max(1, values.length - 1);
            const label = String(d.date || '').slice(5); // MM-DD
            return (
              <text key={i} x={x} y={height - 8} fontSize="11" fill="rgba(0,0,0,0.55)" textAnchor="middle">
                {label}
              </text>
            );
          })}
        </svg>

        {/* ✅ Tooltip */}
        {tooltipText && tip ? (
          <div
            style={{
              position: 'absolute',
              left: Math.min(tip.x + 12, 860),
              top: Math.max(8, tip.y - 44),
              pointerEvents: 'none',
              background: 'rgba(0,0,0,0.85)',
              color: 'white',
              padding: '8px 10px',
              borderRadius: 10,
              fontSize: 12,
              boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
              maxWidth: 260,
              zIndex: 5,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{tooltipText.date}</div>
            <div style={{ opacity: 0.9 }}>
              {valueKey === 'orders' ? 'Заказы: ' : valueKey === 'revenue' ? 'Сумма: ' : 'Значение: '}
              <span style={{ fontWeight: 700 }}>{tooltipText.value}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="text-xs opacity-70 mt-2">
        Цвет: <span style={{ color: 'rgba(220,38,38,0.95)' }}>мало</span> →{' '}
        <span style={{ color: 'rgba(245,158,11,0.95)' }}>средне</span> →{' '}
        <span style={{ color: 'rgba(34,197,94,0.95)' }}>много</span>
      </div>
    </div>
  );
}

export default function RestaurantDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const today = useMemo(() => new Date(), []);
  const [presetDays, setPresetDays] = useState<number>(30);
  const [from, setFrom] = useState<string>(toYmdLocalInput(new Date(today.getTime() - 30 * 86400000)));
  const [to, setTo] = useState<string>(toYmdLocalInput(today));

  // ✅ активный пресет (для подсветки кнопки)
  const activePreset = useMemo(() => detectPreset(from, to), [from, to]);

  // ✅ сворачивание блоков
  const [ordersOpen, setOrdersOpen] = useState(true);
  const [clientsOpen, setClientsOpen] = useState(true);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (from && to) {
      sp.set('from', from);
      sp.set('to', to);
      return sp.toString();
    }
    sp.set('days', String(presetDays));
    return sp.toString();
  }, [from, to, presetDays]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    apiGet<Metrics>(`${API_URL}/restaurants/${id}/metrics?${query}`)
      .then((m) => {
        if (!alive) return;
        setMetrics(m || null);
      })
      .catch((e: any) => {
        if (!alive) return;
        setMetrics(null);
        setErr(e?.message || 'Ошибка загрузки');
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [id, query]);

  function applyPreset(days: number) {
    setPresetDays(days);
    const t = new Date();
    setTo(toYmdLocalInput(t));
    setFrom(toYmdLocalInput(new Date(t.getTime() - days * 86400000)));
  }

  // ✅ стиль кнопки пресета (ярко-зелёная активная)
  const presetBtnClass = (days: 7 | 30 | 90) =>
    activePreset === days ? 'btn btn-sm btn-success fw-semibold' : 'btn btn-sm btn-light';

  const safe = {
    totalOrders: metrics?.totalOrders ?? 0,
    deliveredCount: metrics?.deliveredCount ?? 0,
    canceledCount: metrics?.canceledCount ?? 0,
    paidCount: metrics?.paidCount ?? 0,

    revenueTotal: metrics?.revenue?.totalRevenue ?? 0,
    avgCheck: metrics?.avgCheckRevenue ?? 0,
    trend: metrics?.trendRevenuePercent ?? null,

    paidRate: metrics?.rates?.paidRatePercent ?? 0,
    cancelRate: metrics?.rates?.cancelRatePercent ?? 0,

    ratingAvg: metrics?.reviews?.ratingAvg ?? null,
    reviewsCount: metrics?.reviews?.reviewsCount ?? 0,
    reviewRate: metrics?.reviews?.reviewRatePercent ?? 0,

    activeCustomers: metrics?.customers?.activeCustomers ?? 0,
    activeCustomers7d: metrics?.customers?.activeCustomers7d ?? 0,
    activeCustomers30d: metrics?.customers?.activeCustomers30d ?? 0,
    newCustomers: metrics?.customers?.newCustomers ?? 0,
    repeatRate: metrics?.customers?.repeatRatePercent ?? 0,
  };

  const reviewsUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    return `/layout-20/restaurants/${id}/reviews?${sp.toString()}`;
  }, [id, from, to]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm btn-light" onClick={() => router.back()}>
            ← Назад
          </button>
          <h1 className="text-lg font-semibold">Ресторан</h1>
          {loading && <div className="text-sm opacity-70">Загрузка...</div>}
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-sm btn-light" onClick={() => alert('Меню (скоро)')}>
            🍽️ Меню (скоро)
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => router.push(reviewsUrl)}>
            ★ Отзывы
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      )}

      {/* Restaurant card + period */}
      {metrics?.restaurant && (
        <div className="rounded-xl border p-4 bg-white">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="font-semibold text-lg">{metrics.restaurant.nameRu}</div>
                <span className="badge badge-light-primary">{metrics.restaurant.status}</span>
              </div>
              <div className="text-sm opacity-70 mt-1">
                slug: <span className="text-black">{metrics.restaurant.slug}</span>
              </div>
              <div className="text-xs opacity-70 mt-1">ID: {metrics.restaurant.id}</div>
            </div>

            <div className="rounded-xl border p-3 bg-black/[0.02] w-full xl:w-[520px]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Период аналитики</div>
                {metrics?.period ? (
                  <div className="text-xs opacity-70">
                    {new Date(metrics.period.from).toLocaleDateString('ru-RU')} →{' '}
                    {new Date(metrics.period.to).toLocaleDateString('ru-RU')} ({metrics.period.days} дн.)
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                <button className={presetBtnClass(7)} onClick={() => applyPreset(7)} style={{ borderRadius: 10 }}>
                  7 дней
                </button>
                <button className={presetBtnClass(30)} onClick={() => applyPreset(30)} style={{ borderRadius: 10 }}>
                  30 дней
                </button>
                <button className={presetBtnClass(90)} onClick={() => applyPreset(90)} style={{ borderRadius: 10 }}>
                  90 дней
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                <div>
                  <div className="text-xs opacity-70 mb-1">С даты</div>
                  <input
                    className="form-control form-control-sm"
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      // если руками меняем даты — activePreset сам станет null (или совпадёт, если даты вернутся)
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">По дату</div>
                  <input
                    className="form-control form-control-sm"
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="text-xs opacity-70 mt-2">Период влияет на метрики и графики.</div>
            </div>
          </div>
        </div>
      )}

      {/* KPI */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Выручка</div>
              <div className="text-lg font-semibold">{fmtMoney(safe.revenueTotal)}</div>
              <div className="text-xs opacity-70">Средний чек: {fmtMoney(safe.avgCheck)}</div>
            </div>

            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Тренд выручки</div>
              <div className="text-lg font-semibold">{safe.trend == null ? '—' : `${safe.trend}%`}</div>
              <div className="text-xs opacity-70">Текущие 30 vs предыдущие 30</div>
            </div>

            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Заказы</div>
              <div className="text-lg font-semibold">{safe.totalOrders}</div>
              <div className="text-xs opacity-70">
                Доставлено: {safe.deliveredCount} / Отменено: {safe.canceledCount}
              </div>
            </div>

            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">% оплат</div>
              <div className="text-lg font-semibold">{safe.paidRate}%</div>
              <div className="text-xs opacity-70">Оплачено: {safe.paidCount}</div>
            </div>

            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">% отмен</div>
              <div className="text-lg font-semibold">{safe.cancelRate}%</div>
              <div className="text-xs opacity-70">Отменено: {safe.canceledCount}</div>
            </div>

            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Оценка</div>
              <div className="text-lg font-semibold">{safe.ratingAvg == null ? '—' : `${safe.ratingAvg} ★`}</div>
              <div className="text-xs opacity-70">
                Отзывов: {safe.reviewsCount} ({safe.reviewRate}% от доставок)
              </div>
            </div>
          </div>

          {/* Customers row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Клиенты (в период)</div>
              <div className="text-lg font-semibold">{safe.activeCustomers}</div>
              <div className="text-xs opacity-70">Новых: {safe.newCustomers}</div>
            </div>
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Активные 7 дней</div>
              <div className="text-lg font-semibold">{safe.activeCustomers7d}</div>
              <div className="text-xs opacity-70">уникальных</div>
            </div>
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Активные 30 дней</div>
              <div className="text-lg font-semibold">{safe.activeCustomers30d}</div>
              <div className="text-xs opacity-70">уникальных</div>
            </div>
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Повторные</div>
              <div className="text-lg font-semibold">{safe.repeatRate}%</div>
              <div className="text-xs opacity-70">доля повторов</div>
            </div>
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm opacity-70">Отзывы</div>
              <button className="btn btn-sm btn-light mt-2" onClick={() => router.push(reviewsUrl)}>
                Открыть отзывы →
              </button>
              <div className="text-xs opacity-70 mt-2">Отдельная страница</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <NiceLineChart
              title="Выручка по дням (DELIVERED + PAID)"
              subtitle="Наведи на линию/точку — увидишь дату и сумму рядом с мышкой."
              data={metrics.daily || []}
              valueKey="revenue"
              height={200}
              formatValue={(v) => fmtMoney(v)}
            />
            <NiceLineChart
              title="Заказы по дням"
              subtitle="Наведи на линию/точку — увидишь дату и количество заказов."
              data={metrics.daily || []}
              valueKey="orders"
              height={200}
              formatValue={(v) => `${Math.round(v).toLocaleString('ru-RU')}`}
            />
          </div>

          {/* Suggestions */}
          <div className="rounded-xl border p-4 bg-white">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="font-semibold">Советы</div>
              <div className="text-xs opacity-70">Автоматические подсказки по цифрам</div>
            </div>

            {metrics.suggestions?.length ? (
              <div className="space-y-2">
                {metrics.suggestions.map((s, idx) => (
                  <div key={idx} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={badgeBySuggestionType(s.type)}>{s.title}</span>
                      <span className="text-sm opacity-80">{s.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm opacity-70">Пока нет рекомендаций</div>
            )}
          </div>

          {/* Recent orders (collapsible) */}
          <div className="rounded-xl border p-4 bg-white">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="font-semibold">Последние заказы</div>
                <span className="badge badge-light-primary">{(metrics.recentOrders || []).length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => setOrdersOpen((v) => !v)}
                  title="Свернуть/развернуть"
                >
                  {ordersOpen ? 'Свернуть' : 'Развернуть'}
                </button>

                <button className="btn btn-sm btn-light" onClick={() => router.push('/layout-20/orders')}>
                  Все заказы →
                </button>
              </div>
            </div>

            {ordersOpen ? (
              <div className="overflow-auto rounded-xl border">
                <table className="min-w-[1200px] w-full text-sm">
                  <thead className="bg-black/5">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Дата</th>
                      <th className="text-left p-3">Статус</th>
                      <th className="text-left p-3">Оплата</th>
                      <th className="text-left p-3">Сумма</th>
                      <th className="text-left p-3">Клиент</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics.recentOrders || []).map((o, idx) => (
                      <tr
                        key={o.id}
                        className={`border-t hover:bg-black/5 cursor-pointer ${idx % 2 ? 'bg-black/[0.01]' : ''}`}
                        onClick={() => router.push(`/layout-20/orders/${o.id}`)}
                        title="Открыть заказ"
                      >
                        <td className="p-3 font-mono text-xs">{o.id}</td>
                        <td className="p-3">{fmtDateTime(o.createdAt)}</td>
                        <td className="p-3">
                          <span className={statusBadge(o.status)}>{o.status}</span>
                        </td>
                        <td className="p-3">
                          <span className={statusBadge(o.paymentStatus)}>{o.paymentStatus}</span>
                          <span className="text-xs opacity-70 ml-2">{o.paymentMethod || '—'}</span>
                        </td>
                        <td className="p-3 font-semibold">{fmtMoney(o.total)}</td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-semibold">{o.userName || o.userId}</span>
                            <span className="text-xs opacity-70">{o.userPhone || '—'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {(metrics.recentOrders || []).length === 0 && (
                      <tr>
                        <td className="p-6 opacity-70" colSpan={6}>
                          Нет заказов за выбранный период
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm opacity-70">Список заказов свернут</div>
            )}
          </div>

          {/* Top clients (collapsible) */}
          <div className="rounded-xl border p-4 bg-white">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="font-semibold">ТОП клиенты</div>
                <span className="badge badge-light-primary">{(metrics.topClients || []).length}</span>
              </div>

              <button
                className="btn btn-sm btn-light"
                onClick={() => setClientsOpen((v) => !v)}
                title="Свернуть/развернуть"
              >
                {clientsOpen ? 'Свернуть' : 'Развернуть'}
              </button>
            </div>

            {clientsOpen ? (
              <>
                <div className="text-xs opacity-70 mb-3">Кликабельно → профиль клиента</div>

                <div className="overflow-auto rounded-xl border">
                  <table className="min-w-[1100px] w-full text-sm">
                    <thead className="bg-black/5">
                      <tr>
                        <th className="text-left p-3">Клиент</th>
                        <th className="text-left p-3">Телефон</th>
                        <th className="text-left p-3">Статус</th>
                        <th className="text-left p-3">Заказов</th>
                        <th className="text-left p-3">Потрачено</th>
                        <th className="text-left p-3">Последний заказ</th>
                        <th className="text-left p-3">Дней с последнего</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(metrics.topClients || []).map((u, idx) => (
                        <tr
                          key={u.userId}
                          className={`border-t cursor-pointer hover:bg-black/5 ${idx % 2 ? 'bg-black/[0.01]' : ''}`}
                          onClick={() => router.push(`/layout-20/users/${u.userId}`)}
                          title="Открыть клиента"
                        >
                          <td className="p-3">{u.name || u.userId}</td>
                          <td className="p-3">{u.phone || '—'}</td>
                          <td className="p-3">{u.status}</td>
                          <td className="p-3">{u.ordersCount}</td>
                          <td className="p-3">{fmtMoney(u.spent)}</td>
                          <td className="p-3">{fmtDateTime(u.lastOrderAt)}</td>
                          <td className="p-3">{u.recencyDays ?? '—'}</td>
                        </tr>
                      ))}

                      {(metrics.topClients || []).length === 0 && (
                        <tr>
                          <td className="p-6 opacity-70" colSpan={7}>
                            Нет данных
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-70">Список клиентов свернут</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
