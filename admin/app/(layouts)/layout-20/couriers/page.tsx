"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  // приходит из user.isActive (если прокидываешь с бэка)
  isActive?: boolean | null;

  personalFeeOverride?: number | null;

  lastActiveAt?: string | null;
  lastSeenAt?: string | null;
};

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

function initials(firstName?: string, lastName?: string) {
  const a = (firstName ?? "").trim();
  const b = (lastName ?? "").trim();
  const s = `${a} ${b}`.trim();
  if (!s) return "C";
  const parts = s.split(/\s+/).filter(Boolean);
  const i1 = parts[0]?.[0] ?? "C";
  const i2 = parts[1]?.[0] ?? "";
  return (i1 + i2).toUpperCase();
}

/**
 * Находит scroll-родителей и “замораживает” их overflow,
 * чтобы страница/лейаут не скроллились вместе с нашими панелями.
 */
function lockScrollParents(root: HTMLElement | null) {
  if (!root) return () => {};

  const locked: Array<{
    el: HTMLElement;
    overflow: string;
    overflowY: string;
    overscrollBehavior: string;
  }> = [];

  const isScrollable = (el: HTMLElement) => {
    const style = window.getComputedStyle(el);
    const oy = style.overflowY;
    const ox = style.overflowX;
    const canScrollY =
      (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 2;
    const canScrollX =
      (ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 2;
    return canScrollY || canScrollX;
  };

  // идём вверх от root и лочим до body
  let cur: HTMLElement | null = root.parentElement;
  while (cur && cur !== document.body) {
    if (isScrollable(cur)) {
      locked.push({
        el: cur,
        overflow: cur.style.overflow || "",
        overflowY: cur.style.overflowY || "",
        overscrollBehavior: cur.style.overscrollBehavior || "",
      });

      // лочим
      cur.style.overflow = "hidden";
      cur.style.overflowY = "hidden";
      cur.style.overscrollBehavior = "none";
    }
    cur = cur.parentElement;
  }

  // на всякий — html/body тоже
  const html = document.documentElement;
  const body = document.body;

  const htmlPrev = {
    overflow: html.style.overflow || "",
    overflowY: html.style.overflowY || "",
    overscrollBehavior: html.style.overscrollBehavior || "",
  };
  const bodyPrev = {
    overflow: body.style.overflow || "",
    overflowY: body.style.overflowY || "",
    overscrollBehavior: body.style.overscrollBehavior || "",
  };

  const prevHtml = window.getComputedStyle(html);
  const prevBody = window.getComputedStyle(body);

  if (prevHtml.overflowY !== "hidden") {
    html.style.overflowY = "hidden";
    html.style.overscrollBehavior = "none";
  }
  if (prevBody.overflowY !== "hidden") {
    body.style.overflowY = "hidden";
    body.style.overscrollBehavior = "none";
  }

  return () => {
    // restore parents
    for (const x of locked) {
      x.el.style.overflow = x.overflow;
      x.el.style.overflowY = x.overflowY;
      x.el.style.overscrollBehavior = x.overscrollBehavior;
    }
    // restore html/body
    html.style.overflow = htmlPrev.overflow;
    html.style.overflowY = htmlPrev.overflowY;
    html.style.overscrollBehavior = htmlPrev.overscrollBehavior;

    body.style.overflow = bodyPrev.overflow;
    body.style.overflowY = bodyPrev.overflowY;
    body.style.overscrollBehavior = bodyPrev.overscrollBehavior;
  };
}

export default function CouriersPage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [onlineFilter, setOnlineFilter] = useState<"all" | "online" | "offline">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ✅ фиксируем скролл лейаута/страницы, чтобы скроллились ТОЛЬКО панели
  useEffect(() => {
    const unlock = lockScrollParents(rootRef.current);
    return () => unlock();
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiFetch(`/couriers?page=1&limit=200`);
        const items = data?.items ?? [];
        if (alive) setCouriers(items);
      } catch (err: any) {
        if (alive) setError(err?.message || "Ошибка");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => couriers ?? [], [couriers]);

  const filtered = useMemo(() => {
    const query = norm(q);

    return rows.filter((c) => {
      if (onlineFilter === "online" && !c.isOnline) return false;
      if (onlineFilter === "offline" && c.isOnline) return false;

      if (!query) return true;

      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
      const hay = norm([c.phone, c.iin, fullName].join(" "));
      return hay.includes(query);
    });
  }, [rows, q, onlineFilter]);

  const counts = useMemo(() => {
    const total = rows.length;
    const online = rows.filter((c) => c.isOnline).length;
    const offline = total - online;

    const active = rows.filter((c) => (c.isActive ?? true) === true).length;
    const blocked = total - active;

    return { total, online, offline, active, blocked };
  }, [rows]);

  if (loading) return <div className="p-4">Загрузка...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;

  return (
    <div ref={rootRef} className="container-fluid couriers-page">
      {/* header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h2 className="mb-1">Курьеры</h2>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Всего: <b>{counts.total}</b> · Онлайн: <b>{counts.online}</b> · Оффлайн:{" "}
            <b>{counts.offline}</b>
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <input
            className="form-control couriers-search"
            style={{ width: 360 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск: телефон / имя / ИИН"
          />

          <select
            className="form-select"
            style={{ width: 190 }}
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value as any)}
          >
            <option value="all">Все</option>
            <option value="online">Только онлайн</option>
            <option value="offline">Только оффлайн</option>
          </select>

          <button
            className="btn btn-light"
            onClick={() => {
              setQ("");
              setOnlineFilter("all");
            }}
          >
            Сброс
          </button>
        </div>
      </div>

      {/* split */}
      <div className="split-screen">
        {/* LEFT */}
        <section className="pane left-pane">
          <header className="pane-header">
            <div>
              <div className="pane-title">Список курьеров</div>
              <div className="pane-sub text-muted">
                Найдено: <b>{filtered.length}</b>
              </div>
            </div>
          </header>

          <div className="pane-body">
            <div className="table-responsive">
              <table className="table table-striped align-middle couriers-grid">
                <thead>
                  <tr className="couriers-head">
                    <th style={{ width: 56 }} />
                    <th className="text-nowrap">Имя / Фамилия</th>
                    <th className="text-nowrap">ИИН</th>
                    <th className="text-nowrap">Статус</th>
                    <th className="text-nowrap">Телефон</th>
                    <th className="text-nowrap">Онлайн</th>
                    <th className="text-nowrap text-end" style={{ width: 170 }}>
                      Действия
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted py-4">
                        Ничего не найдено
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => {
                      const fullName =
                        `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "-";
                      const isSelected = selectedId === c.id;
                      const active = (c.isActive ?? true) === true;

                      return (
                        <tr
                          key={c.id}
                          onMouseEnter={() => setSelectedId(c.id)}
                          onMouseLeave={() => setSelectedId(null)}
                          onClick={() => router.push(`/layout-20/couriers/${c.id}`)}
                          style={{ cursor: "pointer" }}
                          className={isSelected ? "row-selected" : ""}
                          title="Открыть карточку курьера"
                        >
                          <td>
                            <div className="avatar-circle">
                              {initials(c.firstName, c.lastName)}
                            </div>
                          </td>

                          <td className="text-nowrap">{fullName}</td>
                          <td className="text-nowrap">{c.iin || "-"}</td>

                          <td className="text-nowrap">
                            <span
                              className={`badge ${
                                active
                                  ? "bg-success-subtle text-success"
                                  : "bg-danger-subtle text-danger"
                              }`}
                            >
                              {active ? "Активный" : "Заблокирован"}
                            </span>
                          </td>

                          <td className="text-nowrap">{c.phone || "-"}</td>

                          <td className="text-nowrap">
                            {c.isOnline ? (
                              <span className="dot dot-green">●</span>
                            ) : (
                              <span className="dot dot-red">●</span>
                            )}{" "}
                            {c.isOnline ? "Онлайн" : "Оффлайн"}
                          </td>

                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/layout-20/couriers/${c.id}`);
                              }}
                            >
                              Редактировать
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="pane right-pane">
          <header className="pane-header">
            <div>
              <div className="pane-title">Статистика</div>
              <div className="pane-sub text-muted">Здесь будут метрики/графики</div>
            </div>
          </header>

          <div className="pane-body">
            {/* компактные карточки */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Всего</div>
                <div className="stat-value">{counts.total}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Онлайн</div>
                <div className="stat-value">{counts.online}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Оффлайн</div>
                <div className="stat-value">{counts.offline}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Активные</div>
                <div className="stat-value">{counts.active}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Заблок.</div>
                <div className="stat-value">{counts.blocked}</div>
              </div>
            </div>

            {/* место под графики */}
            <div className="chart-card">
              <div className="chart-title">Онлайн / оффлайн</div>
              <div className="mini-bars">
                <div className="mini-bar">
                  <div
                    className="mini-bar-fill"
                    style={{
                      width: `${
                        counts.total ? (counts.online / counts.total) * 100 : 0
                      }%`,
                    }}
                  />
                  <div className="mini-bar-caption">Онлайн: {counts.online}</div>
                </div>
                <div className="mini-bar">
                  <div
                    className="mini-bar-fill"
                    style={{
                      width: `${
                        counts.total ? (counts.offline / counts.total) * 100 : 0
                      }%`,
                    }}
                  />
                  <div className="mini-bar-caption">Оффлайн: {counts.offline}</div>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">Активность по часам</div>
              <div className="chart-placeholder">
                Сюда подключим график (courier-metrics)
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">Активность по дням</div>
              <div className="chart-placeholder">
                Сюда подключим график (courier-metrics)
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        /* ===== Page sizing ===== */
        .couriers-page {
          height: calc(100vh - 120px);
          min-height: 560px;
          overflow: hidden;
        }

        /* ===== Split ===== */
        .split-screen {
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-columns: 680px 1fr;
          gap: 16px;
        }

        .pane {
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          background: #fff;

          display: flex;
          flex-direction: column;
        }

        .pane-header {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex: 0 0 auto;
        }

        .pane-title {
          font-weight: 900;
          color: #111;
          line-height: 1.2;
        }
        .pane-sub {
          font-size: 12px;
        }

        .pane-body {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          overscroll-behavior: contain;
          padding: 10px 12px;
        }

        /* ===== Search (жирная рамка) ===== */
        .couriers-search {
          border: 2px solid rgba(0, 0, 0, 0.35) !important;
          font-weight: 700;
        }
        .couriers-search:focus {
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15) !important;
          border-color: rgba(13, 110, 253, 0.65) !important;
        }

        /* ===== Table ===== */
        .couriers-head th {
          color: #111 !important;
          font-weight: 900 !important;
          opacity: 1 !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
          white-space: nowrap;
        }

        .couriers-grid th,
        .couriers-grid td {
          border-right: 1px solid rgba(0, 0, 0, 0.06) !important;
          vertical-align: middle;
        }
        .couriers-grid th:last-child,
        .couriers-grid td:last-child {
          border-right: none !important;
        }

        .couriers-grid tbody tr:hover {
          background: rgba(0, 123, 255, 0.06) !important;
        }
        .couriers-grid tbody tr.row-selected {
          background: rgba(0, 123, 255, 0.1) !important;
        }

        .avatar-circle {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 12px;
          background: rgba(255, 0, 0, 0.12);
          color: rgba(140, 0, 0, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .dot {
          font-weight: 900;
        }
        .dot-green {
          color: #18a34a;
        }
        .dot-red {
          color: #dc2626;
        }

        /* ===== Stats (компактнее) ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .stat-card {
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 10px 12px;
          background: #fff;
        }
        .stat-label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
          font-weight: 700;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 900;
          color: #111;
          line-height: 1.1;
          margin-top: 2px;
        }

        .chart-card {
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
          margin-bottom: 12px;
        }
        .chart-title {
          font-weight: 900;
          color: #111;
          margin-bottom: 10px;
        }

        .mini-bars {
          display: grid;
          gap: 10px;
        }
        .mini-bar {
          position: relative;
          height: 32px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(0, 0, 0, 0.03);
        }
        .mini-bar-fill {
          height: 100%;
          background: rgba(13, 110, 253, 0.25);
        }
        .mini-bar-caption {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          padding-left: 10px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(0, 0, 0, 0.75);
        }

        .chart-placeholder {
          height: 140px;
          border-radius: 10px;
          border: 1px dashed rgba(0, 0, 0, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0, 0, 0, 0.5);
          font-size: 13px;
          padding: 10px;
          text-align: center;
        }

        /* адаптив */
        @media (max-width: 1200px) {
          .split-screen {
            grid-template-columns: 1fr;
          }
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}