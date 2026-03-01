"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type OrderRow = {
  id: string;
  number?: number | null;

  createdAt: string;
  status: string;
  total: number;

  phone?: string | null;

  restaurant?: { id: string; nameRu?: string | null; nameKk?: string | null };
  courier?: { userId?: string; firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
};

function isDigitsOnly(v: string) {
  return /^[0-9]+$/.test(v);
}

function formatCourier(c: OrderRow["courier"]) {
  if (!c) return "Не назначен";
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  const phone = c.phone ? ` (${c.phone})` : "";
  return (name || "Курьер") + phone;
}

function formatRestaurant(r: OrderRow["restaurant"]) {
  if (!r) return "-";
  return (r.nameRu ?? r.nameKk ?? "-") as string;
}

export default function OrdersPage() {
  const router = useRouter();

  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");

  async function load() {
    // Пытаемся взять побольше, как у тебя на других страницах
    // Если у тебя другой эндпоинт/параметры — скажи, подстрою.
    const data = (await apiFetch(`/orders?limit=200`)) as any;

    // поддержка разных форматов ответа:
    // 1) массив
    // 2) { items: [] }
    // 3) { data: [] }
    const list: OrderRow[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
      ? data.data
      : [];

    setRows(list);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await load();
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Ошибка загрузки");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    const sDigits = isDigitsOnly(s);

    return rows.filter((o) => {
      const id = (o.id ?? "").toLowerCase();
      const num = o.number == null ? "" : String(o.number);
      const phone = (o.phone ?? "").toLowerCase();
      const status = (o.status ?? "").toLowerCase();
      const rest = formatRestaurant(o.restaurant).toLowerCase();
      const cour = formatCourier(o.courier).toLowerCase();

      // если введены цифры — чаще всего это номер заказа или телефон
      if (sDigits) {
        return num.includes(s) || phone.includes(s);
      }

      return (
        id.includes(s) ||
        num.includes(s) ||
        phone.includes(s) ||
        status.includes(s) ||
        rest.includes(s) ||
        cour.includes(s)
      );
    });
  }, [rows, q]);

  const totalCount = rows.length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-700 font-semibold mb-2">Ошибка</div>
        <div className="text-gray-800 mb-4">{error}</div>
        <button
          className="px-4 py-2 rounded bg-gray-900 text-white"
          onClick={() => router.refresh()}
        >
          Обновить
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="text-xl font-semibold">Заказы</div>
        <div className="text-sm text-gray-600">
          Всего: {totalCount}
        </div>
      </div>

      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
        <input
          className="w-full md:max-w-xl border rounded px-3 py-2"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск: № заказа / id / статус / телефон / ресторан / курьер"
        />
        <button
          className="px-4 py-2 rounded bg-gray-100"
          onClick={() => {
            setQ("");
          }}
        >
          Сброс
        </button>
      </div>

      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b bg-gray-50">
              <th className="py-2 px-3">№</th>
              <th className="py-2 px-3">ID (uuid)</th>
              <th className="py-2 px-3">Дата</th>
              <th className="py-2 px-3">Статус</th>
              <th className="py-2 px-3">Сумма</th>
              <th className="py-2 px-3">Ресторан</th>
              <th className="py-2 px-3">Курьер</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((o) => {
              const orderNo = o.number ?? null;

              return (
                <tr
                  key={o.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/layout-20/orders/${o.id}`)}
                  title="Открыть заказ"
                >
                  <td className="py-2 px-3 font-semibold">
                    {/* ✅ Кликабельный номер заказа */}
                    {orderNo != null ? (
                      <span className="underline underline-offset-2">
                        {orderNo}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="py-2 px-3 font-mono text-xs text-gray-700">
                    {o.id}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>

                  <td className="py-2 px-3">{o.status}</td>

                  <td className="py-2 px-3">{o.total}</td>

                  <td className="py-2 px-3">{formatRestaurant(o.restaurant)}</td>

                  <td className="py-2 px-3">{formatCourier(o.courier)}</td>
                </tr>
              );
            })}

            {!filtered.length && (
              <tr>
                <td className="py-6 px-3 text-gray-600" colSpan={7}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Совет: ищи заказ по номеру (цифры). UUID оставлен как технич. поле.
      </div>
    </div>
  );
}