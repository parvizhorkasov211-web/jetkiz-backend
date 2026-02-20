"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Courier = {
  id: string;
  userId: string;
  phone: string;
  firstName: string;
  lastName: string;
  iin: string;
  isOnline: boolean;
  personalFeeOverride?: number | null;
};

export default function CourierDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [data, setData] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const json = await apiFetch(`/couriers/${params.id}`);
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setError(e?.message || "Ошибка");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [params.id]);

  const fullName = useMemo(() => {
    if (!data) return "-";
    return `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() || "-";
  }, [data]);

  if (loading) return <div className="p-4">Загрузка...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;
  if (!data) return <div className="p-4">Нет данных</div>;

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-light" onClick={() => router.back()}>
          ← Назад
        </button>
        <h2 className="mb-0">Карточка курьера</h2>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle courier-grid">
              <tbody>
                <tr>
                  <th>ID</th>
                  <td className="text-break">{data.id}</td>
                </tr>
                <tr>
                  <th>Статус</th>
                  <td>{data.isOnline ? "🟢 Онлайн" : "🔴 Оффлайн"}</td>
                </tr>
                <tr>
                  <th>Телефон</th>
                  <td>{data.phone || "-"}</td>
                </tr>
                <tr>
                  <th>Имя</th>
                  <td>{fullName}</td>
                </tr>
                <tr>
                  <th>ИИН</th>
                  <td>{data.iin || "-"}</td>
                </tr>
                <tr>
                  <th>Персональная комиссия</th>
                  <td>{data.personalFeeOverride ?? "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <style jsx global>{`
            /* В карточке делаем как Excel */
            .courier-grid {
              border: 1px solid rgba(0, 0, 0, 0.10);
            }
            .courier-grid th,
            .courier-grid td {
              border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
              padding: 12px 14px !important;
              color: #111 !important;
            }
            .courier-grid tr:last-child th,
            .courier-grid tr:last-child td {
              border-bottom: none !important;
            }
            .courier-grid th {
              width: 260px;
              font-weight: 800 !important;
              background: rgba(0, 0, 0, 0.04);
              white-space: nowrap;
            }
            .courier-grid td {
              font-weight: 500 !important;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}