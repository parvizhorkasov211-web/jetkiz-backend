'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Suggestion = { type: 'warning' | 'info' | 'success'; title: string; text: string };

type Metrics = {
  restaurant?: {
    id: string;
    number: number;
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
  if (t <= 0.33) return 'rgba(220, 38, 38, 0.95)';
  if (t <= 0.66) return 'rgba(245, 158, 11, 0.95)';
  return 'rgba(34, 197, 94, 0.95)';
}

/**
 * preset active if:
 * - to = today
 * - from = today - {7|30|90}
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

/** ====== UI Primitives ====== */

function Panel({
  title,
  subtitle,
  right,
  children,
  className = '',
  tone = 'default',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'muted';
}) {
  const shell = tone === 'muted' ? 'bg-slate-100/80 border-slate-200' : 'bg-white border-slate-200';
  const body = tone === 'muted' ? 'bg-white/70' : 'bg-white';

  return (
    <div className={`rounded-2xl border shadow-sm ${shell} ${className}`}>
      <div className="px-4 py-4 border-b border-slate-200/70 flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-2xl leading-tight">{title}</div>
          {subtitle ? <div className="text-base opacity-70 mt-2">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0 text-base">{right}</div> : null}
      </div>

      <div className={`p-5 rounded-b-2xl ${body}`}>{children}</div>
    </div>
  );
}

type StatTheme = 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'teal' | 'gray';

function themeToBg(theme: StatTheme) {
  switch (theme) {
    case 'green':
      return 'bg-gradient-to-br from-emerald-500 to-emerald-700';
    case 'blue':
      return 'bg-gradient-to-br from-sky-500 to-indigo-700';
    case 'purple':
      return 'bg-gradient-to-br from-fuchsia-500 to-purple-700';
    case 'orange':
      return 'bg-gradient-to-br from-orange-400 to-rose-600';
    case 'red':
      return 'bg-gradient-to-br from-red-500 to-rose-700';
    case 'teal':
      return 'bg-gradient-to-br from-teal-500 to-cyan-700';
    default:
      return 'bg-gradient-to-br from-slate-500 to-slate-700';
  }
}

function StatCard({
  title,
  value,
  hint,
  theme = 'blue',
  icon,
  right,
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  theme?: StatTheme;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-sm border border-white/15 ${themeToBg(theme)}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <span className="text-2xl">{icon ?? '●'}</span>
          </div>
          <div className="text-lg opacity-95 font-semibold">{title}</div>
        </div>
        {right ? <div className="text-base opacity-95">{right}</div> : null}
      </div>

      <div className="mt-4 text-4xl font-extrabold leading-tight">{value}</div>

      {hint ? <div className="mt-3 text-base opacity-95">{hint}</div> : null}
    </div>
  );
}

/**
 * Chart (tooltip)
 */
function NiceLineChart({
  title,
  subtitle,
  data,
  valueKey,
  valueSuffix,
  height = 210,
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
  const padR = 52;
  const padT = 14;
  const padB = 32;

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
    <div>
      {title ? (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="font-semibold text-2xl">{title}</div>
            {subtitle ? <div className="text-base opacity-70 mt-2">{subtitle}</div> : null}
          </div>
          <div className="text-lg opacity-70">
            Последнее: <span className="text-black font-semibold">{valueToText(last)}</span>
          </div>
        </div>
      ) : null}

      <div
        ref={wrapRef}
        className="overflow-auto rounded-2xl border border-slate-200 bg-white"
        style={{ position: 'relative' }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <svg width={width} height={height} className="block">
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line x1={padL} y1={t.y} x2={width - padR} y2={t.y} stroke="rgba(0,0,0,0.08)" />
              <text x={width - padR + 8} y={t.y + 5} fontSize="14" fill="rgba(0,0,0,0.55)">
                {t.v.toLocaleString('ru-RU')}
              </text>
            </g>
          ))}

          <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="rgba(0,0,0,0.12)" />
          <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="rgba(0,0,0,0.12)" />

          <path d={path} fill="none" stroke="rgba(15, 23, 42, 0.85)" strokeWidth="2.6" />

          {points.map((p) => (
            <circle
              key={p.i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === p.i ? 5.6 : 3.6}
              fill={levelColor(p.t)}
              stroke="rgba(0,0,0,0.12)"
            />
          ))}

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

          {(data || []).map((d, i) => {
            if (i % xLabelEvery !== 0 && i !== data.length - 1) return null;
            const x = padL + (i * plotW) / Math.max(1, values.length - 1);
            const label = String(d.date || '').slice(5);
            return (
              <text key={i} x={x} y={height - 8} fontSize="14" fill="rgba(0,0,0,0.55)" textAnchor="middle">
                {label}
              </text>
            );
          })}
        </svg>

        {tooltipText && tip ? (
          <div
            style={{
              position: 'absolute',
              left: Math.min(tip.x + 12, 820),
              top: Math.max(8, tip.y - 56),
              pointerEvents: 'none',
              background: 'rgba(2,6,23,0.88)',
              color: 'white',
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              maxWidth: 320,
              zIndex: 5,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 4 }}>{tooltipText.date}</div>
            <div style={{ opacity: 0.98 }}>
              {valueKey === 'orders' ? 'Заказы: ' : valueKey === 'revenue' ? 'Сумма: ' : 'Значение: '}
              <span style={{ fontWeight: 900 }}>{tooltipText.value}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="text-base opacity-70 mt-3">
        Цвет: <span style={{ color: 'rgba(220,38,38,0.95)' }}>мало</span> →{' '}
        <span style={{ color: 'rgba(245,158,11,0.95)' }}>средне</span> →{' '}
        <span style={{ color: 'rgba(34,197,94,0.95)' }}>много</span>
      </div>
    </div>
  );
}

/** ====== Header Main Buttons ====== */
function HeaderMainButton({
  label,
  sublabel,
  icon,
  onClick,
  variant,
}: {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: 'menu' | 'reviews';
}) {
  const base =
    'inline-flex items-center gap-4 px-5 py-4 rounded-2xl font-extrabold shadow-sm border transition-all active:scale-[0.99]';

  const styles =
    variant === 'menu'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700/40'
      : 'bg-amber-400 hover:bg-amber-500 text-black border-amber-600/30';

  return (
    <button className={`${base} ${styles}`} onClick={onClick} style={{ minWidth: 220 }}>
      <span className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-2xl">{icon}</span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-lg">{label}</span>
        {sublabel ? <span className="text-sm opacity-90 font-semibold">{sublabel}</span> : null}
      </span>
    </button>
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

  const activePreset = useMemo(() => detectPreset(from, to), [from, to]);

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

  // ✅ маршрут на страницу отзывов внутри ресторана + проброс периода
  const reviewsUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    const qs = sp.toString();
    return `/layout-20/restaurants/${id}/reviews${qs ? `?${qs}` : ''}`;
  }, [id, from, to]);

  // ✅ маршрут на меню ресторана
  const menuUrl = useMemo(() => `/layout-20/restaurants/${id}/menu`, [id]);

  const headerRight = (
    <div className="flex items-center gap-4">
      <HeaderMainButton
        variant="menu"
        icon="🍽️"
        label="Меню"
        sublabel="управление товарами"
        onClick={() => router.push(menuUrl)}
      />
      <HeaderMainButton
        variant="reviews"
        icon="★"
        label="Отзывы"
        sublabel={`рейтинг и комментарии · ${safe.reviewsCount}`}
        onClick={() => router.push(reviewsUrl)}
      />
    </div>
  );

  return (
    <div className="space-y-5 rounded-2xl p-4 md:p-5 bg-slate-50">
      {/* Top header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button className="btn btn-lg btn-light" onClick={() => router.back()} style={{ borderRadius: 14 }}>
            ← Назад
          </button>
          <div>
            <div className="text-3xl font-extrabold leading-tight">Ресторан · Аналитика</div>
            <div className="text-lg opacity-70 mt-1">
              {metrics?.restaurant?.nameRu ? metrics.restaurant.nameRu : '—'}
              {loading ? ' · загрузка…' : ''}
            </div>
          </div>
        </div>
        {headerRight}
      </div>

      {err && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-lg text-red-700">{err}</div>}

      {/* Restaurant + Period */}
      {metrics?.restaurant ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel
            title={
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold">{metrics.restaurant.nameRu}</span>
                <span className="badge badge-light-primary" style={{ fontSize: 14, padding: '8px 10px' }}>
                  {metrics.restaurant.status}
                </span>
              </div>
            }
            subtitle={
              <div className="space-y-2">
                <div>
                  slug: <span className="font-semibold text-black">{metrics.restaurant.slug}</span>
                </div>
                <div>№ ресторана: {metrics.restaurant.number}</div>
              </div>
            }
            className="xl:col-span-1"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-black/[0.02]">
                <div className="text-base opacity-70">Заказы</div>
                <div className="text-3xl font-extrabold mt-1">{safe.totalOrders}</div>
                <div className="text-base opacity-70 mt-2">
                  ✅ {safe.deliveredCount} · ❌ {safe.canceledCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-black/[0.02]">
                <div className="text-base opacity-70">Оплачено</div>
                <div className="text-3xl font-extrabold mt-1">{safe.paidRate}%</div>
                <div className="text-base opacity-70 mt-2">шт: {safe.paidCount}</div>
              </div>
            </div>
          </Panel>

          {/* ✅ FIXED: Период аналитики */}
          <Panel
            title={
              <div className="flex items-center gap-3 flex-wrap">
                <span>Период аналитики</span>
                {metrics?.period ? (
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-base font-semibold">
                    {new Date(metrics.period.from).toLocaleDateString('ru-RU')} —{' '}
                    {new Date(metrics.period.to).toLocaleDateString('ru-RU')} ({metrics.period.days} дн.)
                  </span>
                ) : null}
              </div>
            }
            right={
              <span className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-base font-semibold">Фильтр</span>
            }
            className="xl:col-span-2"
          >
            <div className="space-y-6">
              {/* Быстрые пресеты */}
              <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="text-xl font-extrabold">Быстрый выбор</div>
                  <div className="text-base opacity-70">Пресеты (7 / 30 / 90)</div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {[7, 30, 90].map((d) => {
                    const active = activePreset === d;
                    return (
                      <button
                        key={d}
                        onClick={() => applyPreset(d)}
                        className={`px-6 py-3 rounded-2xl text-lg font-extrabold transition-all border
                          ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                              : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'
                          }`}
                        title={`Выбрать период ${d} дней`}
                      >
                        {d} дней
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ручной диапазон */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="text-xl font-extrabold">Произвольный диапазон</div>
                  <div className="text-base opacity-70">Выбери даты вручную</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-base font-semibold mb-2">С даты</div>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <div className="text-base font-semibold mb-2">По дату</div>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Инфо */}
              <div className="px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 text-base text-blue-800">
                Период влияет на метрики и графики. Пресет активен только если «по дату» = сегодня.
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      {/* KPI Ribbon */}
      {metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            theme="green"
            icon="₸"
            title="Выручка (итого)"
            value={fmtMoney(safe.revenueTotal)}
            hint={
              <span>
                Средний чек: <b>{fmtMoney(safe.avgCheck)}</b>
              </span>
            }
            right={
              safe.trend == null ? (
                '—'
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="opacity-90">тренд</span> <b>{safe.trend}%</b>
                </span>
              )
            }
          />

          <StatCard
            theme="blue"
            icon="🧾"
            title="Заказы"
            value={safe.totalOrders.toLocaleString('ru-RU')}
            hint={
              <span>
                Доставлено: <b>{safe.deliveredCount}</b> · Отменено: <b>{safe.canceledCount}</b>
              </span>
            }
          />

          <StatCard
            theme="teal"
            icon="💳"
            title="Оплаты"
            value={`${safe.paidRate}%`}
            hint={
              <span>
                Оплачено: <b>{safe.paidCount}</b>
              </span>
            }
          />

          <StatCard
            theme="red"
            icon="⛔"
            title="Отмены"
            value={`${safe.cancelRate}%`}
            hint={
              <span>
                Отменено: <b>{safe.canceledCount}</b>
              </span>
            }
          />
        </div>
      ) : null}

      {/* Secondary KPI row */}
      {metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5">
          <StatCard
            theme="purple"
            icon="👥"
            title="Клиенты"
            value={safe.activeCustomers.toLocaleString('ru-RU')}
            hint={
              <span>
                Новых: <b>{safe.newCustomers}</b> · Повторы: <b>{safe.repeatRate}%</b>
              </span>
            }
          />
          <StatCard theme="gray" icon="7d" title="Активные 7 дней" value={safe.activeCustomers7d} hint="уникальных" />
          <StatCard theme="gray" icon="30d" title="Активные 30 дней" value={safe.activeCustomers30d} hint="уникальных" />
          <StatCard
            theme="orange"
            icon="★"
            title="Рейтинг"
            value={safe.ratingAvg == null ? '—' : `${safe.ratingAvg} ★`}
            hint={
              <span>
                Отзывов: <b>{safe.reviewsCount}</b> · {safe.reviewRate}% от доставок
              </span>
            }
            right={
              <button
                className="btn btn-lg btn-light"
                onClick={() => router.push(reviewsUrl)}
                style={{ borderRadius: 14 }}
              >
                Открыть
              </button>
            }
          />
          <StatCard theme="blue" icon="📦" title="Доставлено" value={safe.deliveredCount} hint="шт. за период" />
        </div>
      ) : null}

      {/* Charts */}
      {metrics ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel
            title="Выручка по дням"
            subtitle="DELIVERED + PAID. Наведи на линию — увидишь дату и сумму."
            right={
              <span className="badge badge-light-success" style={{ fontSize: 14, padding: '8px 10px' }}>
                Revenue
              </span>
            }
          >
            <NiceLineChart data={metrics.daily || []} valueKey="revenue" title="" height={230} formatValue={(v) => fmtMoney(v)} />
          </Panel>

          <Panel
            title="Заказы по дням"
            subtitle="Наведи на линию — увидишь дату и количество заказов."
            right={
              <span className="badge badge-light-primary" style={{ fontSize: 14, padding: '8px 10px' }}>
                Orders
              </span>
            }
          >
            <NiceLineChart
              data={metrics.daily || []}
              valueKey="orders"
              title=""
              height={230}
              formatValue={(v) => `${Math.round(v).toLocaleString('ru-RU')}`}
            />
          </Panel>
        </div>
      ) : null}

      {/* Suggestions (muted) */}
      {metrics ? (
        <Panel
          tone="muted"
          title="Советы"
          subtitle="Автоматические подсказки по цифрам"
          right={
            <span className="badge badge-light-primary" style={{ fontSize: 14, padding: '8px 10px' }}>
              AI hints
            </span>
          }
        >
          {metrics.suggestions?.length ? (
            <div className="space-y-3">
              {metrics.suggestions.map((s, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 p-4 bg-black/[0.01]">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={badgeBySuggestionType(s.type)} style={{ fontSize: 14, padding: '8px 10px' }}>
                      {s.title}
                    </span>
                    <span className="text-lg opacity-80">{s.text}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-lg opacity-70">Пока нет рекомендаций</div>
          )}
        </Panel>
      ) : null}

      {/* Recent Orders */}
      {metrics ? (
        <Panel
          title={
            <div className="flex items-center gap-3">
              <span>Последние заказы</span>
              <span className="badge badge-light-primary" style={{ fontSize: 14, padding: '8px 10px' }}>
                {(metrics.recentOrders || []).length}
              </span>
            </div>
          }
          subtitle="Кликабельно → открывает заказ"
          right={
            <div className="flex items-center gap-3">
              <button
                className="btn btn-lg btn-light"
                onClick={() => setOrdersOpen((v) => !v)}
                style={{ borderRadius: 14 }}
              >
                {ordersOpen ? 'Свернуть' : 'Развернуть'}
              </button>
              <button className="btn btn-lg btn-light" onClick={() => router.push('/layout-20/orders')} style={{ borderRadius: 14 }}>
                Все заказы →
              </button>
            </div>
          }
        >
          {ordersOpen ? (
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-[1200px] w-full text-base">
                <thead className="bg-black/5 sticky top-0">
                  <tr>
                    <th className="text-left p-4">ID</th>
                    <th className="text-left p-4">Дата</th>
                    <th className="text-left p-4">Статус</th>
                    <th className="text-left p-4">Оплата</th>
                    <th className="text-left p-4">Сумма</th>
                    <th className="text-left p-4">Клиент</th>
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
                      <td className="p-4 font-mono text-sm">{o.id}</td>
                      <td className="p-4">{fmtDateTime(o.createdAt)}</td>
                      <td className="p-4">
                        <span className={statusBadge(o.status)} style={{ fontSize: 14, padding: '8px 10px' }}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={statusBadge(o.paymentStatus)} style={{ fontSize: 14, padding: '8px 10px' }}>
                          {o.paymentStatus}
                        </span>
                        <span className="text-base opacity-70 ml-3">{o.paymentMethod || '—'}</span>
                      </td>
                      <td className="p-4 font-extrabold">{fmtMoney(o.total)}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold">{o.userName || o.userId}</span>
                          <span className="text-base opacity-70">{o.userPhone || '—'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {(metrics.recentOrders || []).length === 0 && (
                    <tr>
                      <td className="p-6 opacity-70 text-lg" colSpan={6}>
                        Нет заказов за выбранный период
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-lg opacity-70">Список заказов свернут</div>
          )}
        </Panel>
      ) : null}

      {/* Top Clients (muted) */}
      {metrics ? (
        <Panel
          tone="muted"
          title={
            <div className="flex items-center gap-3">
              <span>ТОП клиенты</span>
              <span className="badge badge-light-primary" style={{ fontSize: 14, padding: '8px 10px' }}>
                {(metrics.topClients || []).length}
              </span>
            </div>
          }
          subtitle="Кликабельно → профиль клиента"
          right={
            <button
              className="btn btn-lg btn-light"
              onClick={() => setClientsOpen((v) => !v)}
              style={{ borderRadius: 14 }}
            >
              {clientsOpen ? 'Свернуть' : 'Развернуть'}
            </button>
          }
        >
          {clientsOpen ? (
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-[1100px] w-full text-base">
                <thead className="bg-black/5 sticky top-0">
                  <tr>
                    <th className="text-left p-4">Клиент</th>
                    <th className="text-left p-4">Телефон</th>
                    <th className="text-left p-4">Статус</th>
                    <th className="text-left p-4">Заказов</th>
                    <th className="text-left p-4">Потрачено</th>
                    <th className="text-left p-4">Последний заказ</th>
                    <th className="text-left p-4">Дней с последнего</th>
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
                      <td className="p-4 font-extrabold">{u.name || u.userId}</td>
                      <td className="p-4">{u.phone || '—'}</td>
                      <td className="p-4">{u.status}</td>
                      <td className="p-4 font-semibold">{u.ordersCount}</td>
                      <td className="p-4 font-extrabold">{fmtMoney(u.spent)}</td>
                      <td className="p-4">{fmtDateTime(u.lastOrderAt)}</td>
                      <td className="p-4 font-semibold">{u.recencyDays ?? '—'}</td>
                    </tr>
                  ))}

                  {(metrics.topClients || []).length === 0 && (
                    <tr>
                      <td className="p-6 opacity-70 text-lg" colSpan={7}>
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-lg opacity-70">Список клиентов свернут</div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}