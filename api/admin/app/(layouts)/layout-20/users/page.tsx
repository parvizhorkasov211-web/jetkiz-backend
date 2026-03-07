'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Segment = 'NEW' | 'REGULAR' | 'VIP';

type Row = {
  id: string;
  phone: string;
  name: string | null;
  ordersCount: number;
  lastOrderAt: string | null;
  lastOrderStatus: string | null;
  lastOrderTotal: number | null;
  segment: Segment;
};

function segmentLabel(s: Segment) {
  if (s === 'NEW') return 'Первичный';
  if (s === 'VIP') return 'VIP';
  return 'Постоянный';
}

function segmentBadgeClass(s: Segment) {
  // NEW = жёлтый, REGULAR = синий, VIP = зелёный
  if (s === 'NEW') return 'badge badge-light-warning';
  if (s === 'VIP') return 'badge badge-light-success';
  return 'badge badge-light-primary';
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

export default function UsersPage() {
  const router = useRouter();

  const [q, setQ] = useState('');
  const [segment, setSegment] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const limit = 20;

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (segment) sp.set('segment', segment);
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    return sp.toString();
  }, [q, segment, page]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    apiGet<{ items: Row[]; meta: { total: number } }>(
      `${API_URL}/users/customers?${query}`,
    )
      .then((data) => {
        if (!alive) return;
        setItems(data.items || []);
        setTotal(data.meta?.total || 0);
      })
      .catch((e: any) => {
        if (!alive) return;
        setItems([]);
        setTotal(0);
        setErr(e?.message || 'Ошибка загрузки');
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [query]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Пользователи (клиенты)</h1>

        <input
          className="input w-[320px]"
          placeholder="Поиск: телефон / имя"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="input w-[220px]"
          value={segment}
          onChange={(e) => {
            setSegment(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Все</option>
          <option value="NEW">Первичный</option>
          <option value="REGULAR">Постоянный</option>
          <option value="VIP">VIP</option>
        </select>

        {loading && <div className="text-sm opacity-70">Загрузка...</div>}
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left p-3">Телефон</th>
              <th className="text-left p-3">Имя</th>
              <th className="text-left p-3">Заказов</th>
              <th className="text-left p-3">Последний заказ</th>
              <th className="text-left p-3">Статус</th>
              <th className="text-left p-3">Сумма</th>
              <th className="text-left p-3">Сегмент</th>
            </tr>
          </thead>

          <tbody>
            {items.map((x) => (
              <tr
                key={x.id}
                className="border-t cursor-pointer hover:bg-black/5"
                onClick={() => router.push(`/layout-20/users/${x.id}`)}
              >
                <td className="p-3">{x.phone}</td>
                <td className="p-3">{x.name || '-'}</td>
                <td className="p-3">{x.ordersCount}</td>
                <td className="p-3">
                  {x.lastOrderAt ? new Date(x.lastOrderAt).toLocaleString() : '-'}
                </td>
                <td className="p-3">{x.lastOrderStatus || '-'}</td>
                <td className="p-3">{x.lastOrderTotal ?? '-'}</td>
                <td className="p-3">
                  <span className={segmentBadgeClass(x.segment)}>
                    {segmentLabel(x.segment)}
                  </span>
                </td>
              </tr>
            ))}

            {!loading && items.length === 0 && (
              <tr>
                <td className="p-6 opacity-70" colSpan={7}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Назад
        </button>
        <div className="text-sm">
          {page} / {pages}
        </div>
        <button
          className="btn"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Вперёд
        </button>
      </div>
    </div>
  );
}
