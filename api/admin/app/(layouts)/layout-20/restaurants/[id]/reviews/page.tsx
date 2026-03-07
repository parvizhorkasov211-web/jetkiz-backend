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
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
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
  // ymd: YYYY-MM-DD
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
      badge: 'badge badge-light-success',
      rowBg: 'rgba(34, 197, 94, 0.06)',
      textColor: 'rgba(22, 163, 74, 1)',
      border: 'rgba(34, 197, 94, 0.26)',
    };
  }
  if (r >= 3) {
    return {
      label: 'Средне',
      badge: 'badge badge-light-warning',
      rowBg: 'rgba(245, 158, 11, 0.06)',
      textColor: 'rgba(217, 119, 6, 1)',
      border: 'rgba(245, 158, 11, 0.26)',
    };
  }
  return {
    label: 'Плохо',
    badge: 'badge badge-light-danger',
    rowBg: 'rgba(220, 38, 38, 0.06)',
    textColor: 'rgba(220, 38, 38, 1)',
    border: 'rgba(220, 38, 38, 0.26)',
  };
}

function toYmdLocalInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 13h3M7 17h3M14 13h3M14 17h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** ✅ определяем активный пресет по текущим from/to */
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
  const isCustomRange = useMemo(() => Boolean(from && to && !activePreset), [from, to, activePreset]);

  const presetBtnClass = (days: 7 | 30 | 90) =>
    activePreset === days ? 'btn btn-sm btn-success fw-semibold' : 'btn btn-sm btn-light fw-semibold';

  const customBtnClass = isCustomRange ? 'btn btn-sm btn-success fw-semibold' : 'btn btn-sm btn-light fw-semibold';

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
    const s = { good: 0, mid: 0, bad: 0 };
    for (const r of items) {
      const x = Math.round(Number(r.rating || 0));
      if (x >= 5) s.good += 1;
      else if (x >= 3) s.mid += 1;
      else s.bad += 1;
    }
    return s;
  }, [items]);

  const periodLabel = useMemo(() => {
    if (!from || !to) return '—';
    const left = fmtDateOnly(from);
    const right = fmtDateOnly(to);
    return `${left} → ${right}`;
  }, [from, to]);

  return (
    <div className="container-fluid">
      {/* ✅ Компактный верх */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link href={`/layout-20/restaurants/${id}`} className="btn btn-sm btn-light fw-semibold" style={{ borderRadius: 10 }}>
            ← Назад
          </Link>

          <div className="d-flex flex-column">
            <div className="fw-bold" style={{ fontSize: 18, lineHeight: 1.2 }}>
              Отзывы ресторана
            </div>
            <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.2 }}>
              5★ зелёный • 3–4★ жёлтый • 1–2★ красный
              {loading ? <span className="ms-2">• загрузка…</span> : null}
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <span className="badge badge-light-success" style={{ padding: '8px 10px', borderRadius: 999, fontWeight: 900 }}>
            Отличные: {stats.good}
          </span>
          <span className="badge badge-light-warning" style={{ padding: '8px 10px', borderRadius: 999, fontWeight: 900 }}>
            Средние: {stats.mid}
          </span>
          <span className="badge badge-light-danger" style={{ padding: '8px 10px', borderRadius: 999, fontWeight: 900 }}>
            Плохие: {stats.bad}
          </span>
        </div>
      </div>

      {/* ✅ Компактная панель периода/пагинации */}
      <div className="card mb-3" style={{ borderRadius: 14 }}>
        <div className="card-body" style={{ padding: 14 }}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            {/* left: период + пресеты */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <div className="fw-bold" style={{ fontSize: 13, minWidth: 64 }}>
                  Период
                </div>

                <span
                  className="badge badge-light"
                  style={{
                    borderRadius: 999,
                    padding: '8px 10px',
                    fontWeight: 900,
                    border: isCustomRange || activePreset ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(0,0,0,0.10)',
                    background: isCustomRange || activePreset ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.02)',
                    color: isCustomRange || activePreset ? 'rgba(22,163,74,1)' : 'rgba(0,0,0,0.65)',
                  }}
                  title="Текущий период"
                >
                  {periodLabel}
                </span>
              </div>

              <div className="d-flex flex-wrap gap-2 ms-0 ms-md-2">
                <button className={presetBtnClass(7)} style={{ borderRadius: 999 }} onClick={() => applyPreset(7)}>
                  7д
                </button>
                <button className={presetBtnClass(30)} style={{ borderRadius: 999 }} onClick={() => applyPreset(30)}>
                  30д
                </button>
                <button className={presetBtnClass(90)} style={{ borderRadius: 999 }} onClick={() => applyPreset(90)}>
                  90д
                </button>

                {/* ✅ если кастом — тоже зелёный, чтобы было ясно что выбран не пресет */}
                <button className={customBtnClass} style={{ borderRadius: 999 }} type="button">
                  Диапазон
                </button>
              </div>
            </div>

            {/* right: лимит + пагинация */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted" style={{ fontSize: 12 }}>
                  Лимит
                </span>
                <select
                  className="form-select form-select-sm"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{ borderRadius: 12, fontWeight: 800, width: 92 }}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary fw-semibold"
                  style={{ borderRadius: 12, minWidth: 44, height: 36 }}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Назад"
                >
                  ←
                </button>

                <div
                  className="px-3 d-flex align-items-center justify-content-center"
                  style={{
                    borderRadius: 12,
                    minWidth: 96,
                    height: 36,
                    border: '1px solid rgba(0,0,0,0.12)',
                    background: 'rgba(0,0,0,0.02)',
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                  title="Страница"
                >
                  {page} / {totalPages}
                </div>

                <button
                  className="btn btn-sm btn-outline-secondary fw-semibold"
                  style={{ borderRadius: 12, minWidth: 44, height: 36 }}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Вперёд"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* ✅ Даты (компактно, в одну строку) */}
          <div className="row g-2 mt-2">
            <div className="col-12 col-md-4">
              <div className="input-group input-group-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
                <span className="input-group-text" style={{ borderRadius: 12, fontWeight: 800 }}>
                  С
                </span>
                <input
                  type="date"
                  className="form-control"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  style={{ fontWeight: 800 }}
                />
                <span className="input-group-text" style={{ borderRadius: 12 }}>
                  <CalendarIcon />
                </span>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="input-group input-group-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
                <span className="input-group-text" style={{ borderRadius: 12, fontWeight: 800 }}>
                  По
                </span>
                <input
                  type="date"
                  className="form-control"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  style={{ fontWeight: 800 }}
                />
                <span className="input-group-text" style={{ borderRadius: 12 }}>
                  <CalendarIcon />
                </span>
              </div>
            </div>

            <div className="col-12 col-md-4 d-flex align-items-center justify-content-md-end">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Всего отзывов: <span className="fw-bold">{total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ borderRadius: 14 }}>
          {error}
        </div>
      )}

      {/* ✅ Таблица/отзывы — без изменений */}
      <div className="card" style={{ borderRadius: 14 }}>
        <div className="card-body">
          {loading ? (
            <div className="text-muted">Загрузка…</div>
          ) : !items.length ? (
            <div className="text-muted">Нет отзывов за выбранный период</div>
          ) : (
            <div
              className="table-responsive"
              style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <table className="table align-middle mb-0" style={{ minWidth: 1350 }}>
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#F6F8FB',
                    borderBottom: '1px solid rgba(0,0,0,0.10)',
                  }}
                >
                  <tr>
                    <th style={{ width: 210, fontWeight: 800, color: '#111', padding: '14px 14px' }}>Оценка</th>
                    <th style={{ fontWeight: 800, color: '#111', padding: '14px 14px' }}>Текст</th>
                    <th style={{ width: 200, fontWeight: 800, color: '#111', padding: '14px 14px' }}>Дата</th>
                    <th style={{ width: 140, fontWeight: 800, color: '#111', padding: '14px 14px' }}>Заказ</th>
                    <th style={{ width: 140, fontWeight: 800, color: '#111', padding: '14px 14px' }}>Сумма</th>
                    <th style={{ width: 220, fontWeight: 800, color: '#111', padding: '14px 14px' }}>Клиент</th>
                    <th style={{ width: 170, fontWeight: 800, color: '#111', padding: '14px 14px' }}>Телефон</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((r) => {
                    const meta = ratingMeta(r.rating);

                    const clientName =
                      r.user?.firstName || r.user?.lastName
                        ? `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim()
                        : r.user?.phone || r.userId;

                    return (
                      <tr
                        key={r.id}
                        style={{
                          background: meta.rowBg,
                          borderLeft: `4px solid ${meta.border}`,
                        }}
                      >
                        <td style={{ padding: '14px 14px' }}>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              className={meta.badge}
                              style={{
                                borderRadius: 999,
                                padding: '8px 10px',
                                fontWeight: 900,
                                minWidth: 64,
                                textAlign: 'center',
                              }}
                            >
                              {Math.round(r.rating)}★
                            </span>

                            <div>
                              <div style={{ color: meta.textColor, fontWeight: 900, lineHeight: 1.1 }}>
                                {stars(r.rating)}
                              </div>
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {meta.label}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 14px' }}>
                          <div style={{ fontWeight: 650, color: '#111', whiteSpace: 'normal' }}>
                            {r.text?.trim() ? r.text : '—'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 14px', fontWeight: 700, color: '#111' }}>
                          {fmtDateTime(r.createdAt)}
                        </td>

                        <td style={{ padding: '14px 14px' }}>
                          {r.orderId ? (
                            <Link
                              href={`/layout-20/orders/${r.orderId}`}
                              className="btn btn-sm btn-outline-primary"
                              style={{ borderRadius: 10 }}
                            >
                              Открыть
                            </Link>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 14px', fontWeight: 900, color: '#111' }}>
                          {r.order?.total != null ? fmtMoney(r.order.total) : <span className="text-muted">—</span>}
                        </td>

                        <td style={{ padding: '14px 14px' }}>
                          <Link href={`/layout-20/users/${r.userId}`} className="text-primary fw-bold">
                            {clientName}
                          </Link>
                        </td>

                        <td style={{ padding: '14px 14px', fontWeight: 800, color: '#111' }}>
                          {r.user?.phone ? r.user.phone : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-muted mt-3" style={{ fontSize: 12 }}>
            Подсказка: клик по клиенту → профиль, кнопка “Открыть” → заказ.
          </div>
        </div>
      </div>

      <div style={{ height: 30 }} />
    </div>
  );
}
