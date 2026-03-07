"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Summary = {
  courierUserId: string;
  balance: number;
  earned: number;
  paid: number;
  commission: number;
  ordersDelivered: number;
  generatedAt: string;
};

type LedgerItem = {
  id: string;
  createdAt: string;
  type: string;
  amount: number;
  comment?: string | null;
  orderId?: string | null;
  orderNumber?: number | null;
};

function fmtMoney(v: any) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ru-RU");
}

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function clampPct(v: any): number | null {
  if (v == null) return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export function CourierFinancePanel(props: { courierId: string }) {
  const courierId = props.courierId;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // commission override
  const [commissionPct, setCommissionPct] = useState<string>("");

  // payout form
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutComment, setPayoutComment] = useState<string>("");

  const [savingCommission, setSavingCommission] = useState(false);
  const [creatingPayout, setCreatingPayout] = useState(false);

  async function load() {
    if (!courierId) return;

    const [s, l] = await Promise.all([
      apiFetch(`/couriers/${courierId}/finance/summary`),
      apiFetch(`/couriers/${courierId}/finance/ledger?page=1&limit=10`),
    ]);

    setSummary(s);
    setLedger(l?.items ?? []);
    setLedgerTotal(Number(l?.total ?? 0) || 0);

    // commission override is stored in courier profile; endpoint returns only summary/ledger.
    // We keep input as manual override (optional). If you want to display current override,
    // add it to /couriers/:id response and bind here.
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setInfo(null);
        await load();
      } catch (e: any) {
        if (alive) setError(e?.message || "Ошибка загрузки финансов");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierId]);

  const cards = useMemo(() => {
    const b = summary?.balance ?? 0;
    const earned = summary?.earned ?? 0;
    const paid = summary?.paid ?? 0;
    const commission = summary?.commission ?? 0;
    const orders = summary?.ordersDelivered ?? 0;

    return [
      { label: "Баланс (к выплате)", value: fmtMoney(b) },
      { label: "Начислено", value: fmtMoney(earned) },
      { label: "Выплачено", value: fmtMoney(paid) },
      { label: "Комиссия сервиса", value: fmtMoney(commission) },
      { label: "Доставлено", value: String(orders) },
    ];
  }, [summary]);

  async function saveCommission() {
    if (!courierId) return;

    const trimmed = commissionPct.trim();
    let value: number | null = null;

    if (trimmed !== "") {
      value = clampPct(trimmed);
      if (value == null) {
        setError("Комиссия должна быть числом 0..100 или пусто");
        return;
      }
    }

    try {
      setSavingCommission(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/finance/commission`, {
        method: "PATCH",
        body: JSON.stringify({
          commissionPctOverride: trimmed === "" ? null : value,
        }),
      });

      setInfo("Комиссия сохранена");
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка сохранения комиссии");
    } finally {
      setSavingCommission(false);
    }
  }

  async function createPayout() {
    if (!courierId) return;

    const amt = Math.round(Number(payoutAmount) || 0);
    if (!amt || amt <= 0) {
      setError("Укажи сумму выплаты");
      return;
    }

    try {
      setCreatingPayout(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/finance/payout`, {
        method: "POST",
        body: JSON.stringify({
          amount: amt,
          comment: payoutComment.trim() || null,
        }),
      });

      setInfo("Выплата создана");
      setPayoutAmount("");
      setPayoutComment("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка создания выплаты");
    } finally {
      setCreatingPayout(false);
    }
  }

  return (
    <div>
      <div className="text-base font-semibold mb-3">Финансы</div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {info}
        </div>
      )}

      {loading && <div className="text-sm text-gray-600">Загрузка…</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded border p-3">
                <div className="text-xs text-gray-500">{c.label}</div>
                <div className="mt-1 text-lg font-semibold">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded border p-3">
            <div className="text-sm font-semibold">Комиссия сервиса (override)</div>
            <div className="mt-2 flex gap-2">
              <input
                className="w-24 border rounded px-3 py-2"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                placeholder="15"
              />
              <button
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
                onClick={saveCommission}
                disabled={savingCommission}
              >
                {savingCommission ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                className="px-3 py-2 rounded border disabled:opacity-60"
                onClick={() => setCommissionPct("")}
                disabled={savingCommission}
                type="button"
              >
                Сбросить
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Пусто = использовать глобальную комиссию из FinanceConfig.
            </div>
          </div>

          <div className="mt-4 rounded border p-3">
            <div className="text-sm font-semibold">Сформировать выплату</div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <input
                className="border rounded px-3 py-2"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Сумма, тг"
              />
              <input
                className="border rounded px-3 py-2"
                value={payoutComment}
                onChange={(e) => setPayoutComment(e.target.value)}
                placeholder="Комментарий (опционально)"
              />
              <button
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
                onClick={createPayout}
                disabled={creatingPayout}
              >
                {creatingPayout ? "Создание…" : "Создать выплату"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">История (ledger)</div>
              <div className="text-xs text-gray-500">
                записей: {ledger.length}/{ledgerTotal}
              </div>
            </div>

            {!ledger.length ? (
              <div className="text-sm text-gray-600">Нет операций</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Дата</th>
                      <th className="py-2 pr-3">Тип</th>
                      <th className="py-2 pr-3">Сумма</th>
                      <th className="py-2 pr-3">Заказ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((x) => (
                      <tr key={x.id} className="border-b">
                        <td className="py-2 pr-3">{fmtDateTime(x.createdAt)}</td>
                        <td className="py-2 pr-3">{x.type}</td>
                        <td className="py-2 pr-3">
                          <span className={x.amount < 0 ? "text-red-600" : "text-green-700"}>
                            {x.amount < 0 ? "-" : "+"}
                            {fmtMoney(Math.abs(x.amount))}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          {x.orderNumber != null ? `#${x.orderNumber}` : x.orderId ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              Последнее обновление: {summary?.generatedAt ? fmtDateTime(summary.generatedAt) : "—"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}