"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type CourierShort = {
  userId: string;
  firstName: string;
  lastName: string;
  isOnline?: boolean;
  user?: { phone?: string };
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  phone?: string;
  restaurant?: { id: string; nameRu: string };

  courierId?: string | null;
  courier?: CourierShort | null;
};

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

function courierLabel(c?: CourierShort | null) {
  if (!c) return "—";
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  const phone = c.user?.phone ? ` (${c.user.phone})` : "";
  return `${name || "Курьер"}${phone}`;
}

export default function OrdersPage() {
  const router = useRouter();

  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiFetch(`/orders?page=1&limit=200`);

        // поддержим оба формата: {items: []} и []
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        if (alive) setItems(items);
      } catch (e: any) {
        if (alive) setError(e?.message || "Ошибка");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = norm(q);
    if (!query) return items;

    return items.filter((o) => {
      const hay = norm(
        [
          o.id,
          o.status,
          o.phone,
          o.restaurant?.nameRu,
          o.total,
          o.courier?.firstName,
          o.courier?.lastName,
          o.courier?.user?.phone,
        ].join(" ")
      );
      return hay.includes(query);
    });
  }, [items, q]);

  if (loading) return <div className="p-4">Загрузка...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="mb-0">Заказы</h2>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Всего: <b>{items.length}</b>
          </div>
        </div>

        <input
          className="form-control"
          style={{ width: 420 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск: id / статус / телефон / ресторан / курьер"
        />
      </div>

      <div className="table-responsive">
        <table className="table table-striped align-middle orders-grid">
          <thead>
            <tr className="orders-head">
              <th className="text-nowrap">ID</th>
              <th className="text-nowrap">Дата</th>
              <th className="text-nowrap">Статус</th>
              <th className="text-nowrap">Сумма</th>
              <th className="text-nowrap">Ресторан</th>
              <th className="text-nowrap">Курьер</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted py-4">
                  Заказов нет
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const isSelected = selectedId === o.id;
                return (
                  <tr
                    key={o.id}
                    onMouseEnter={() => setSelectedId(o.id)}
                    onClick={() => router.push(`/layout-20/orders/${o.id}`)}
                    style={{ cursor: "pointer" }}
                    title="Открыть заказ"
                    className={isSelected ? "row-selected" : ""}
                  >
                    <td className="text-nowrap">{o.id}</td>
                    <td className="text-nowrap">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}
                    </td>
                    <td className="text-nowrap">{o.status}</td>
                    <td className="text-nowrap">{o.total}</td>
                    <td className="text-nowrap">{o.restaurant?.nameRu || "-"}</td>
                    <td className="text-nowrap">
                      {o.courier ? courierLabel(o.courier) : "Не назначен"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .orders-head th {
          color: #111 !important;
          font-weight: 800 !important;
          opacity: 1 !important;
        }

        /* Excel-сетка */
        .orders-grid th,
        .orders-grid td {
          border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
        }
        .orders-grid th:last-child,
        .orders-grid td:last-child {
          border-right: none !important;
        }

        .orders-grid tbody tr:hover {
          background: rgba(0, 123, 255, 0.06) !important;
        }
        .orders-grid tbody tr.row-selected {
          background: rgba(0, 123, 255, 0.10) !important;
        }
      `}</style>
    </div>
  );
}