"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

// ApexCharts нельзя SSR, поэтому dynamic
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Point = { ts: string; online: number };
type ApiResp = {
  period: { from: string; to: string };
  bucket: "hour" | "day";
  points: Point[];
  generatedAt: string;
};

function toShortLabel(tsIso: string, bucket: "hour" | "day") {
  const d = new Date(tsIso);
  if (bucket === "day") {
    return d.toLocaleDateString();
  }
  // hour
  return d.toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function CourierOnlineTimelineChart(props: {
  bucket?: "hour" | "day";
  daysBack?: number;      // сколько дней назад брать по умолчанию
  refreshMs?: number;     // автообновление
  title?: string;
}) {
  const bucket = props.bucket ?? "hour";
  const daysBack = props.daysBack ?? 7;
  const refreshMs = props.refreshMs ?? 30000;
  const title = props.title ?? "Онлайн курьеры по времени";

  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const to = new Date();
    const from = new Date(to.getTime() - daysBack * 86400000);

    const q = new URLSearchParams();
    q.set("bucket", bucket);
    q.set("from", from.toISOString());
    q.set("to", to.toISOString());

    const r = await apiFetch(`/couriers/metrics/online-timeline?${q.toString()}`);
    setData(r);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await load();
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Ошибка загрузки графика");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const t = setInterval(async () => {
      try {
        await load();
      } catch {
        // тихо
      }
    }, refreshMs);

    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, daysBack, refreshMs]);

  const series = useMemo(() => {
    const pts = data?.points ?? [];
    return [
      {
        name: "Онлайн",
        data: pts.map((p) => [new Date(p.ts).getTime(), p.online] as [number, number]),
      },
    ];
  }, [data]);

  const categories = useMemo(() => {
    const pts = data?.points ?? [];
    return pts.map((p) => toShortLabel(p.ts, bucket));
  }, [data, bucket]);

  const maxY = useMemo(() => {
    const pts = data?.points ?? [];
    let m = 0;
    for (const p of pts) if (p.online > m) m = p.online;
    return Math.max(m, 5);
  }, [data]);

  const options = useMemo(() => {
    return {
      chart: {
        type: "area",
        height: 260,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
      grid: {
        strokeDashArray: 4,
        padding: { left: 8, right: 8, top: 8, bottom: 0 },
      },
      xaxis: {
        type: "datetime",
        labels: { show: true },
        tooltip: { enabled: false },
      },
      yaxis: {
        min: 0,
        max: maxY,
        tickAmount: 4,
        labels: { formatter: (v: number) => `${Math.round(v)}` },
      },
      tooltip: {
        x: { format: bucket === "day" ? "dd.MM.yyyy" : "dd.MM.yyyy HH:mm" },
      },
      markers: { size: 0 },
    } as const;
  }, [bucket, maxY]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">
            {data ? (
              <>
                Период:{" "}
                <b className="text-slate-900">
                  {new Date(data.period.from).toLocaleDateString()} — {new Date(data.period.to).toLocaleDateString()}
                </b>
                {" · "}
                Bucket: <b className="text-slate-900">{data.bucket}</b>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          {data?.generatedAt ? `обновлено: ${new Date(data.generatedAt).toLocaleTimeString()}` : ""}
        </div>
      </div>

      <div className="px-5 pb-5">
        {err && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>
        )}

        {loading && <div className="text-sm text-slate-500">Загрузка…</div>}

        {!loading && (data?.points?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Нет данных для графика
          </div>
        )}

        {!loading && (data?.points?.length ?? 0) > 0 && (
          <ReactApexChart options={options as any} series={series as any} type="area" height={260} />
        )}

        {/* Подписи (опционально, если хотите как в Metronic) */}
        {/* <div className="mt-2 text-xs text-slate-400">{categories.slice(-8).join(" · ")}</div> */}
      </div>
    </div>
  );
}