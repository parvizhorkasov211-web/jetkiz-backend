'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

type ReviewItem = {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string;
  orderId: string | null;
  restaurantId: string;
  userId: string;

  order?: { id: string; total: number; createdAt: string };
  user?: { id: string; phone: string; firstName?: string | null; lastName?: string | null };
};

function apiBase() {
  // ✅ FIX: дефолт на 3001 (как у тебя API)
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
}

function fmtMoney(n: number) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('ru-RU').format(v) + ' ₸';
}

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

function fmtDateOnly(ymd: string) {
  try {
    const [Y, M, D] = ymd.split('-').map(Number);
    if (!Y || !M || !D) return ymd;
    const dt = new Date(Y, M - 1, D);
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt);
  } catch {
    return ymd;
  }
}

function stars(r: number) {
  const x = Math.max(0, Math.min(5, Math.round(r || 0)));
  return '★'.repeat(x) + '☆'.repeat(5 - x);
}

function ratingMeta(rating: number) {
  const r = Math.round(Number(rating || 0));
  if (r >= 5) {
    return {
      label: 'Отлично',
      pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rowBg: 'rgba(34, 197, 94, 0.05)',
      textColor: 'rgba(22, 163, 74, 1)',
      border: 'rgba(34, 197, 94, 0.25)',
    };
  }
  if (r >= 3) {
    return {
      label: 'Средне',
      pill: 'bg-amber-100 text-amber-800 border-amber-200',
      rowBg: 'rgba(245, 158, 11, 0.05)',
      textColor: 'rgba(217, 119, 6, 1)',
      border: 'rgba(245, 158, 11, 0.25)',
    };
  }
  return {
    label: 'Плохо',
    pill: 'bg-rose-100 text-rose-700 border-rose-200',
    rowBg: 'rgba(220, 38, 38, 0.05)',
    textColor: 'rgba(220, 38, 38, 1)',
    border: 'rgba(220, 38, 38, 0.25)',
  };
}

function toYmdLocalInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** preset active if:
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

/** ===== UI Primitives (как в аналитике) ===== */

function Panel({
  title,
  subtitle,
  right,
  children,
  tone = 'default',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'muted';
}) {
  const shell = tone === 'muted' ? 'bg-slate-100/80 border-slate-200' : 'bg-white border-slate-200';
  const body = tone === 'muted' ? 'bg-white/70' : 'bg-white';

  return (
    <div className={`rounded-2xl border shadow-sm ${shell}`}>
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

type StatTheme = 'green' | 'blue' | 'orange' | 'red' | 'gray';

function themeToBg(theme: StatTheme) {
  switch (theme) {
    case 'green':
      return 'bg-gradient-to-br from-emerald-500 to-emerald-700';
    case 'blue':
      return 'bg-gradient-to-br from-sky-500 to-indigo-700';
    case 'orange':
      return 'bg-gradient-to-br from-orange-400 to-rose-600';
    case 'red':
      return 'bg-gradient-to-br from-red-500 to-rose-700';
    default:
      return 'bg-gradient-to-br from-slate-500 to-slate-700';
  }
}

function StatCard({
  title,
  value,
  hint,
  theme,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  theme: StatTheme;
  icon?: React.ReactNode;
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
      </div>

      <div className="mt-4 text-4xl font-extrabold leading-tight">{value}</div>
      {hint ? <div className="mt-3 text-base opacity-95">{hint}</div> : null}
    </div>
  );
}

function classPreset(active: boolean) {
  return active
    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
    : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50';
}

export default function RestaurantReviewsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const search = useSearchParams();
  const router = useRouter();

  const [from, setFrom] = useState(search.get('from') || '');
  const [to, setTo] = useState(search.get('to') || '');
  const [page, setPage] = useState<number>(Number(search.get('page') || 1));
  const [limit, setLimit] = useState<number>(Number(search.get('limit') || 50));

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(days: number) {
    const t = new Date();
    const tYmd = toYmdLocalInput(t);
    const fYmd = toYmdLocalInput(new Date(t.getTime() - days * 86400000));
    setFrom(fYmd);
    setTo(tYmd);
    setPage(1);
  }

  useEffect(() => {
    if (!from || !to) {
      const t = new Date();
      setTo(toYmdLocalInput(t));
      setFrom(toYmdLocalInput(new Date(t.getTime() - 30 * 86400000)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePreset = useMemo(() => detectPreset(from, to), [from, to]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    p.set('page', String(page));
    p.set('limit', String(limit));
    p.set('includeOrder', '1');
    p.set('includeUser', '1');
    return p.toString();
  }, [from, to, page, limit]);

  useEffect(() => {
    router.replace(`?${queryString}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const url = `${apiBase()}/restaurants/${id}/reviews?${queryString}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Не удалось загрузить отзывы (${res.status}). ${t}`);
      }
      const j = await res.json();
      const list = Array.isArray(j?.items) ? j.items : Array.isArray(j) ? j : [];
      setItems(list);
      setTotal(Number(j?.meta?.total || list.length || 0));
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setError(e?.message || 'Ошибка загрузки отзывов');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, queryString]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  const stats = useMemo(() => {
    const s = { good: 0, mid: 0, bad: 0, avg: 0 };
    let sum = 0;
    let cnt = 0;

    for (const r of items) {
      const x = Math.round(Number(r.rating || 0));
      sum += x;
      cnt += 1;

      if (x >= 5) s.good += 1;
      else if (x >= 3) s.mid += 1;
      else s.bad += 1;
    }
    s.avg = cnt ? Number((sum / cnt).toFixed(2)) : 0;
    return s;
  }, [items]);

  const periodLabel = useMemo(() => {
    if (!from || !to) return '—';
    return `${fmtDateOnly(from)} — ${fmtDateOnly(to)}`;
  }, [from, to]);

  const headerRight = (
    <div className="flex items-center gap-4">
      <button
        className="btn btn-lg btn-light"
        onClick={() => router.back()}
        style={{ borderRadius: 14 }}
        title="Назад"
      >
        ← Назад
      </button>

      <div className="flex items-center gap-2">
        <button
          className="btn btn-lg btn-light"
          onClick={() => router.push(`/layout-20/restaurants/${id}`)}
          style={{ borderRadius: 14 }}
          title="Вернуться в аналитику ресторана"
        >
          Аналитика
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 rounded-2xl p-4 md:p-5 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-extrabold leading-tight">Отзывы ресторана</div>
          <div className="text-lg opacity-70 mt-1">
            Период: <span className="font-semibold text-black">{periodLabel}</span>
            {loading ? ' · загрузка…' : ''}
          </div>
        </div>
        {headerRight}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-lg text-rose-700">{error}</div>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          theme="green"
          icon="★"
          title="Отличные (5★)"
          value={stats.good}
          hint={<span className="opacity-95">за выбранный период</span>}
        />
        <StatCard
          theme="orange"
          icon="☆"
          title="Средние (3–4★)"
          value={stats.mid}
          hint={<span className="opacity-95">за выбранный период</span>}
        />
        <StatCard
          theme="red"
          icon="✕"
          title="Плохие (1–2★)"
          value={stats.bad}
          hint={<span className="opacity-95">за выбранный период</span>}
        />
        <StatCard
          theme="blue"
          icon="📌"
          title="Всего"
          value={total}
          hint={
            <span className="opacity-95">
              средняя оценка: <b>{stats.avg ? `${stats.avg}★` : '—'}</b>
            </span>
          }
        />
      </div>

      {/* Period panel */}
      <Panel
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>Период</span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-base font-semibold">
              {periodLabel} ({activePreset ? `${activePreset} дн.` : 'кастом'})
            </span>
          </div>
        }
        right={
          <div className="flex items-center gap-3">
            <div className="text-base opacity-70">Лимит</div>
            <select
              className="rounded-2xl border border-slate-300 px-3 py-2 text-base font-semibold bg-white"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              title="Количество на странице"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        }
      >
        <div className="space-y-6">
          {/* presets */}
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
                    className={`px-6 py-3 rounded-2xl text-lg font-extrabold transition-all border ${classPreset(active)}`}
                    title={`Выбрать период ${d} дней`}
                  >
                    {d} дней
                  </button>
                );
              })}
            </div>
          </div>

          {/* custom range */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="text-xl font-extrabold">Произвольный диапазон</div>
              <div className="text-base opacity-70">Выбери даты вручную</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-base font-semibold mb-2">С даты</div>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <div className="text-base font-semibold mb-2">По дату</div>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* pagination */}
              <div className="flex flex-col">
                <div className="text-base font-semibold mb-2">Страница</div>
                <div className="flex items-center gap-3">
                  <button
                    className="btn btn-lg btn-light"
                    style={{ borderRadius: 14 }}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title="Назад"
                  >
                    ←
                  </button>

                  <div
                    className="px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-lg font-extrabold"
                    style={{ minWidth: 140, textAlign: 'center' }}
                    title="Текущая страница"
                  >
                    {page} / {totalPages}
                  </div>

                  <button
                    className="btn btn-lg btn-light"
                    style={{ borderRadius: 14 }}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    title="Вперёд"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 text-base text-blue-800">
              Подсказка: пресет активен только если «по дату» = сегодня. Таблица кликабельна: заказ и клиент открываются отдельно.
            </div>
          </div>
        </div>
      </Panel>

      {/* Table */}
      <Panel
        title={
          <div className="flex items-center gap-3">
            <span>Список отзывов</span>
            <span className="badge badge-light-primary" style={{ fontSize: 14, padding: '8px 10px' }}>
              {items.length}
            </span>
          </div>
        }
        subtitle="Цвет строки зависит от оценки: зелёный (5★), жёлтый (3–4★), красный (1–2★)."
        tone="muted"
      >
        {loading ? (
          <div className="text-lg opacity-70">Загрузка…</div>
        ) : !items.length ? (
          <div className="text-lg opacity-70">Нет отзывов за выбранный период</div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-[1400px] w-full text-base">
              <thead className="bg-black/5 sticky top-0 z-10">
                <tr>
                  <th className="text-left p-4 w-[220px]">Оценка</th>
                  <th className="text-left p-4">Текст</th>
                  <th className="text-left p-4 w-[200px]">Дата</th>
                  <th className="text-left p-4 w-[140px]">Заказ</th>
                  <th className="text-left p-4 w-[170px]">Сумма</th>
                  <th className="text-left p-4 w-[260px]">Клиент</th>
                  <th className="text-left p-4 w-[170px]">Телефон</th>
                </tr>
              </thead>

              <tbody>
                {items.map((r, idx) => {
                  const meta = ratingMeta(r.rating);

                  const clientName =
                    r.user?.firstName || r.user?.lastName
                      ? `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim()
                      : r.user?.phone || r.userId;

                  return (
                    <tr
                      key={r.id}
                      className={`border-t ${idx % 2 ? 'bg-black/[0.01]' : ''}`}
                      style={{
                        background: meta.rowBg,
                        borderLeft: `4px solid ${meta.border}`,
                      }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-3 py-2 rounded-2xl border font-extrabold ${meta.pill}`}>
                            {Math.round(r.rating)}★
                          </span>

                          <div className="flex flex-col">
                            <div style={{ color: meta.textColor, fontWeight: 900, lineHeight: 1.1 }}>
                              {stars(r.rating)}
                            </div>
                            <div className="text-sm opacity-70">{meta.label}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900 whitespace-normal">
                          {r.text?.trim() ? r.text : '—'}
                        </div>
                      </td>

                      <td className="p-4 font-semibold">{fmtDateTime(r.createdAt)}</td>

                      <td className="p-4">
                        {r.orderId ? (
                          <Link
                            href={`/layout-20/orders/${r.orderId}`}
                            className="btn btn-lg btn-light"
                            style={{ borderRadius: 14 }}
                            title="Открыть заказ"
                          >
                            Открыть
                          </Link>
                        ) : (
                          <span className="opacity-70">—</span>
                        )}
                      </td>

                      <td className="p-4 font-extrabold">
                        {r.order?.total != null ? fmtMoney(r.order.total) : <span className="opacity-70">—</span>}
                      </td>

                      <td className="p-4">
                        <Link href={`/layout-20/users/${r.userId}`} className="font-extrabold text-blue-700">
                          {clientName}
                        </Link>
                      </td>

                      <td className="p-4 font-semibold">
                        {r.user?.phone ? r.user.phone : <span className="opacity-70">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-base opacity-70 mt-4">
          Подсказка: клик по клиенту → профиль, «Открыть» → заказ.
        </div>
      </Panel>

      <div style={{ height: 20 }} />
    </div>
  );
}