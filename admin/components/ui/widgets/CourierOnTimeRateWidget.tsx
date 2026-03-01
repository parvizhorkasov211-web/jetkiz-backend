"use client";

import { Clock } from "lucide-react";

export type CourierOnTimeRateMetric = {
  courierUserId: string;
  period: { from: string; to: string };
  deliveredTotal: number;
  deliveredOnTime: number;
  onTimeRatePct: number;
  generatedAt: string;
};

export function CourierOnTimeRateWidget({
  metric,
  loading,
}: {
  metric: CourierOnTimeRateMetric | null;
  loading?: boolean;
}) {
  const pct = metric?.onTimeRatePct ?? 0;
  const total = metric?.deliveredTotal ?? 0;
  const onTime = metric?.deliveredOnTime ?? 0;

  return (
    <div className="rounded border p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-600">On-Time Delivery Rate</div>
          <div className="text-[11px] text-gray-500 mt-1">
            {metric ? "За 30 дней" : "—"}
          </div>
        </div>
        <Clock className="h-4 w-4 text-gray-500" />
      </div>

      <div className="mt-2 flex items-end justify-between gap-4">
        <div className="text-3xl font-semibold leading-none">
          {loading ? "…" : `${pct}%`}
        </div>

        <div className="text-xs text-gray-600">
          {loading ? (
            <span>Загрузка…</span>
          ) : (
            <span>
              Вовремя: <b>{onTime}</b> / <b>{total}</b>
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 h-2 w-full rounded bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-black"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>

      {metric?.deliveredTotal === 0 && !loading ? (
        <div className="mt-2 text-[11px] text-gray-500">
          Нет доставленных заказов с дедлайном (promisedAt) за период.
        </div>
      ) : null}
    </div>
  );
}