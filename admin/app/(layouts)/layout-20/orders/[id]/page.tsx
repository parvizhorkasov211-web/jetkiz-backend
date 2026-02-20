"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type OrderItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
};

type CourierShort = {
  userId: string;
  firstName: string;
  lastName: string;
  iin?: string;
  isOnline?: boolean;
  personalFeeOverride?: number | null;
  user?: { phone?: string };
};

type OrderDetails = {
  id: string;
  status: string;

  subtotal: number;
  deliveryFee: number;
  total: number;

  phone: string;
  comment?: string | null;
  leaveAtDoor?: boolean;

  paymentMethod?: string;
  paymentStatus?: string;

  createdAt: string;

  restaurant?: { id: string; nameRu: string };
  items?: OrderItem[];

  courierId?: string | null;
  courierFee?: number;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;

  courier?: {
    userId: string;
    firstName: string;
    lastName: string;
    isOnline?: boolean;
    user?: { phone?: string };
  } | null;
};

type CouriersListResponse = {
  items: CourierShort[];
  total?: number;
};

function courierLabel(
  c?: { firstName?: string; lastName?: string; user?: { phone?: string } } | null
) {
  if (!c) return "—";
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Курьер";
  const phone = c.user?.phone ? ` (${c.user.phone})` : "";
  return `${name}${phone}`;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [couriers, setCouriers] = useState<CourierShort[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [assigning, setAssigning] = useState(false);
  const [selectedCourierUserId, setSelectedCourierUserId] = useState<string>("");

  const fullCourierName = useMemo(() => {
    if (!order?.courier) return "Не назначен";
    return courierLabel(order.courier);
  }, [order?.courier]);

  // load order + couriers list
  useEffect(() => {
    if (!id) return;

    let alive = true;
    setLoading(true);
    setErr(null);

    Promise.all([
      apiFetch(`/orders/${id}`) as Promise<OrderDetails>,
      apiFetch(`/couriers?page=1&limit=300`) as Promise<CouriersListResponse>,
    ])
      .then(([o, c]) => {
        if (!alive) return;
        setOrder(o);
        setCouriers(c?.items || []);
        setSelectedCourierUserId(o?.courierId || "");
      })
      .catch((e: any) => {
        if (!alive) return;
        setErr(e?.message || "Ошибка загрузки");
        setOrder(null);
        setCouriers([]);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [id]);

  async function refreshOrder() {
    const o = (await apiFetch(`/orders/${id}`)) as OrderDetails;
    setOrder(o);
    setSelectedCourierUserId(o?.courierId || "");
  }

  async function assignCourier(courierUserId: string) {
    if (!id) return;
    setAssigning(true);
    setErr(null);

    try {
      await apiFetch(`/orders/${id}/assign-courier`, {
        method: "PATCH",
        body: JSON.stringify({ courierUserId }),
      });
      await refreshOrder();
    } catch (e: any) {
      setErr(e?.message || "Ошибка назначения курьера");
    } finally {
      setAssigning(false);
    }
  }

  async function autoAssign() {
    if (!id) return;
    setAssigning(true);
    setErr(null);

    try {
      await apiFetch(`/orders/${id}/auto-assign`, { method: "PATCH" });
      await refreshOrder();
    } catch (e: any) {
      setErr(e?.message || "Ошибка автоназначения");
    } finally {
      setAssigning(false);
    }
  }

  // "снять" курьера: пробуем assign-courier с null/"".
  // Если бэк не примет — скажи, я дам маленький endpoint unassign.
  async function unassign() {
    if (!id) return;
    setAssigning(true);
    setErr(null);

    try {
      await apiFetch(`/orders/${id}/assign-courier`, {
        method: "PATCH",
        body: JSON.stringify({ courierUserId: null }),
      });
      await refreshOrder();
    } catch {
      // fallback: пустая строка
      try {
        await apiFetch(`/orders/${id}/assign-courier`, {
          method: "PATCH",
          body: JSON.stringify({ courierUserId: "" }),
        });
        await refreshOrder();
      } catch (e2: any) {
        setErr(e2?.message || "Не удалось снять курьера (нужно добавить endpoint на бэке)");
      }
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-light" onClick={() => router.back()}>
          ← Назад
        </button>
        <h2 className="mb-0">Заказ</h2>
        {loading && <span className="text-muted">Загрузка...</span>}
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {order && (
        <>
          {/* Назначение курьера */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Курьер
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                    {order.courier ? (
                      <>
                        {order.courier.isOnline ? "🟢 " : "🔴 "}
                        {fullCourierName}
                      </>
                    ) : (
                      "Не назначен"
                    )}
                  </div>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    courierFee: <b>{order.courierFee ?? 0}</b>{" "}
                    {order.assignedAt
                      ? `· назначен: ${new Date(order.assignedAt).toLocaleString()}`
                      : ""}
                  </div>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  <select
                    className="form-select"
                    style={{ width: 360 }}
                    value={selectedCourierUserId}
                    onChange={(e) => setSelectedCourierUserId(e.target.value)}
                    disabled={assigning}
                  >
                    <option value="">— выбрать курьера —</option>
                    {couriers.map((c) => {
                      const label = `${c.isOnline ? "🟢" : "🔴"} ${c.firstName} ${c.lastName} (${
                        c.user?.phone || "-"
                      })`;
                      return (
                        <option key={c.userId} value={c.userId}>
                          {label}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    className="btn btn-primary"
                    disabled={assigning || !selectedCourierUserId}
                    onClick={() => assignCourier(selectedCourierUserId)}
                    title="Назначить выбранного курьера"
                  >
                    {assigning ? "..." : "Назначить"}
                  </button>

                  <button
                    className="btn btn-light"
                    disabled={assigning}
                    onClick={autoAssign}
                    title="Автоматически выбрать онлайн-курьера"
                  >
                    {assigning ? "..." : "Автоназначить"}
                  </button>

                  <button
                    className="btn btn-outline-danger"
                    disabled={assigning || !order.courierId}
                    onClick={unassign}
                    title="Снять курьера с заказа"
                  >
                    Снять
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Информация */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="text-muted">ID</div>
                  <div className="fw-bold">{order.id}</div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted">Статус</div>
                  <div className="fw-bold">{order.status}</div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted">Дата</div>
                  <div className="fw-bold">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted">Телефон</div>
                  <div className="fw-bold">{order.phone || "-"}</div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted">Ресторан</div>
                  <div className="fw-bold">{order.restaurant?.nameRu || "-"}</div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted">Оплата</div>
                  <div className="fw-bold">
                    {order.paymentMethod || "-"} / {order.paymentStatus || "-"}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted">Суммы</div>
                  <div className="fw-bold">
                    {order.subtotal} + {order.deliveryFee} = <b>{order.total}</b>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted">Комментарий</div>
                  <div className="fw-bold">{order.comment || "-"}</div>
                </div>

                <div className="col-md-6">
                  <div className="text-muted">Оставить у двери</div>
                  <div className="fw-bold">{order.leaveAtDoor ? "Да" : "Нет"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Позиции */}
          <div className="card">
            <div className="card-body">
              <h4 className="mb-3">Позиции заказа</h4>

              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Позиция</th>
                      <th className="text-nowrap">Цена</th>
                      <th className="text-nowrap">Кол-во</th>
                      <th className="text-nowrap">Итого</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(order.items || []).map((it) => (
                      <tr key={it.id}>
                        <td>{it.title}</td>
                        <td className="text-nowrap">{it.price}</td>
                        <td className="text-nowrap">{it.quantity}</td>
                        <td className="text-nowrap">{it.price * it.quantity}</td>
                      </tr>
                    ))}

                    {!loading && (!order.items || order.items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="text-muted py-4">
                          Позиции не найдены
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}