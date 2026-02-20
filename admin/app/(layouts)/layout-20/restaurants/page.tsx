'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type RestaurantRow = {
  id: string;
  nameRu: string;
  nameKk: string;
  status: string;
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

export default function RestaurantsPage() {
  const router = useRouter();

  const [q, setQ] = useState('');
  const [items, setItems] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    return sp.toString();
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    // ВАЖНО: мы делаем максимально совместимо:
    // если /restaurants возвращает массив — ок
    // если {items, meta} — тоже ок
    apiGet<any>(`${API_URL}/restaurants?${query}`)
      .then((data) => {
        if (!alive) return;

        const list: RestaurantRow[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        setItems(list);
      })
      .catch((e: any) => {
        if (!alive) return;
        setItems([]);
        setErr(e?.message || 'Ошибка загрузки');
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Рестораны</h1>

        <input
          className="input w-[360px]"
          placeholder="Поиск: название"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {loading && <div className="text-sm opacity-70">Загрузка...</div>}
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left p-3">Название (RU)</th>
              <th className="text-left p-3">Название (KZ)</th>
              <th className="text-left p-3">Статус</th>
              <th className="text-left p-3">ID</th>
            </tr>
          </thead>

          <tbody>
            {items.map((x) => (
              <tr
                key={x.id}
                className="border-t cursor-pointer hover:bg-black/5"
                onClick={() => router.push(`/layout-20/restaurants/${x.id}`)}
              >
                <td className="p-3">{x.nameRu}</td>
                <td className="p-3">{x.nameKk}</td>
                <td className="p-3">{x.status}</td>
                <td className="p-3">{x.id}</td>
              </tr>
            ))}

            {!loading && items.length === 0 && (
              <tr>
                <td className="p-6 opacity-70" colSpan={4}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
