"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CouriersPage;
const dynamic_1 = __importDefault(require("next/dynamic"));
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const api_1 = require("@/lib/api");
const ReactApexChart = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require("react-apexcharts"))), { ssr: false });
const norm = (v) => String(v ?? "").trim().toLowerCase();
function initials(firstName, lastName) {
    const a = (firstName ?? "").trim();
    const b = (lastName ?? "").trim();
    const s = `${a} ${b}`.trim();
    if (!s)
        return "C";
    const parts = s.split(/\s+/).filter(Boolean);
    const i1 = parts[0]?.[0] ?? "C";
    const i2 = parts[1]?.[0] ?? "";
    return (i1 + i2).toUpperCase();
}
function resolveAvatarSrc(avatarUrl) {
    if (!avatarUrl)
        return "";
    if (/^https?:\/\//i.test(avatarUrl))
        return avatarUrl;
    return `${api_1.API_URL}${avatarUrl}`;
}
function lockScrollParents(root) {
    if (!root)
        return () => { };
    const locked = [];
    const isScrollable = (el) => {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        const ox = style.overflowX;
        const canScrollY = (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 2;
        const canScrollX = (ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 2;
        return canScrollY || canScrollX;
    };
    let cur = root.parentElement;
    while (cur && cur !== document.body) {
        if (isScrollable(cur)) {
            locked.push({
                el: cur,
                overflow: cur.style.overflow || "",
                overflowY: cur.style.overflowY || "",
                overscrollBehavior: cur.style.overscrollBehavior || "",
            });
            cur.style.overflow = "hidden";
            cur.style.overflowY = "hidden";
            cur.style.overscrollBehavior = "none";
        }
        cur = cur.parentElement;
    }
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
        for (const x of locked) {
            x.el.style.overflow = x.overflow;
            x.el.style.overflowY = x.overflowY;
            x.el.style.overscrollBehavior = x.overscrollBehavior;
        }
        html.style.overflow = htmlPrev.overflow;
        html.style.overflowY = htmlPrev.overflowY;
        html.style.overscrollBehavior = htmlPrev.overscrollBehavior;
        body.style.overflow = bodyPrev.overflow;
        body.style.overflowY = bodyPrev.overflowY;
        body.style.overscrollBehavior = bodyPrev.overscrollBehavior;
    };
}
function safeNumber(x, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
}
function formatDurationHM(sec) {
    const s = typeof sec === "number" && Number.isFinite(sec) && sec >= 0 ? Math.floor(sec) : null;
    if (s == null)
        return "—";
    const totalMin = Math.floor(s / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0)
        return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
    return `${m}м`;
}
function formatAgoHM(iso) {
    if (!iso)
        return "—";
    const d = new Date(iso);
    const t = d.getTime();
    if (!Number.isFinite(t))
        return "—";
    const sec = Math.floor((Date.now() - t) / 1000);
    if (sec < 0)
        return "—";
    return formatDurationHM(sec);
}
function moneyKZT(v) {
    const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
    if (n == null)
        return "—";
    return `${n} ₸`;
}
function pctText(v) {
    const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
    if (n == null)
        return "—";
    return `${n}%`;
}
function commissionAmountKZT(fee, pct) {
    const f = typeof fee === "number" && Number.isFinite(fee) ? fee : null;
    const p = typeof pct === "number" && Number.isFinite(pct) ? pct : null;
    if (f == null || p == null)
        return "—";
    const amt = Math.round((f * p) / 100);
    return `${amt} ₸`;
}
const LS_SHOW_STATS = "couriers_show_stats_v1";
const LS_STATS_EXPANDED = "couriers_stats_expanded_v1";
function CouriersPage() {
    const router = (0, navigation_1.useRouter)();
    const rootRef = (0, react_1.useRef)(null);
    const [couriers, setCouriers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [q, setQ] = (0, react_1.useState)("");
    const [onlineFilter, setOnlineFilter] = (0, react_1.useState)("all");
    const [activeFilter, setActiveFilter] = (0, react_1.useState)("all");
    const [selectedId, setSelectedId] = (0, react_1.useState)(null);
    const [summary, setSummary] = (0, react_1.useState)(null);
    const [summaryLoading, setSummaryLoading] = (0, react_1.useState)(false);
    const [summaryError, setSummaryError] = (0, react_1.useState)(null);
    const [timeline, setTimeline] = (0, react_1.useState)([]);
    const [timelineLoading, setTimelineLoading] = (0, react_1.useState)(false);
    const [timelineError, setTimelineError] = (0, react_1.useState)(null);
    const [series, setSeries] = (0, react_1.useState)([]);
    const [seriesLoading, setSeriesLoading] = (0, react_1.useState)(false);
    const [seriesError, setSeriesError] = (0, react_1.useState)(null);
    const [showStats, setShowStats] = (0, react_1.useState)(true);
    const [statsExpanded, setStatsExpanded] = (0, react_1.useState)(false);
    const [activeTariff, setActiveTariff] = (0, react_1.useState)(null);
    const [tariffLoading, setTariffLoading] = (0, react_1.useState)(false);
    const [tariffError, setTariffError] = (0, react_1.useState)(null);
    const [globalCommissionPct, setGlobalCommissionPct] = (0, react_1.useState)(15);
    const [commissionLoading, setCommissionLoading] = (0, react_1.useState)(false);
    const [showTariffModal, setShowTariffModal] = (0, react_1.useState)(false);
    const [globalFeeInput, setGlobalFeeInput] = (0, react_1.useState)("");
    const [showCommissionModal, setShowCommissionModal] = (0, react_1.useState)(false);
    const [globalCommissionInput, setGlobalCommissionInput] = (0, react_1.useState)("15");
    const [showCourierTariffModal, setShowCourierTariffModal] = (0, react_1.useState)(false);
    const [tariffCourier, setTariffCourier] = (0, react_1.useState)(null);
    const [courierFeeInput, setCourierFeeInput] = (0, react_1.useState)("");
    const [courierUseGlobal, setCourierUseGlobal] = (0, react_1.useState)(false);
    const [tariffSaving, setTariffSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const unlock = lockScrollParents(rootRef.current);
        return () => unlock();
    }, []);
    (0, react_1.useEffect)(() => {
        try {
            const v = localStorage.getItem(LS_SHOW_STATS);
            if (v === "0")
                setShowStats(false);
            if (v === "1")
                setShowStats(true);
            const e = localStorage.getItem(LS_STATS_EXPANDED);
            if (e === "1")
                setStatsExpanded(true);
        }
        catch { }
    }, []);
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem(LS_SHOW_STATS, showStats ? "1" : "0");
        }
        catch { }
    }, [showStats]);
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem(LS_STATS_EXPANDED, statsExpanded ? "1" : "0");
        }
        catch { }
    }, [statsExpanded]);
    (0, react_1.useEffect)(() => {
        let alive = true;
        const loadTariff = async () => {
            try {
                setTariffLoading(true);
                setTariffError(null);
                const t = (await (0, api_1.apiFetch)(`/couriers/tariff/active`));
                if (!alive)
                    return;
                if (t && typeof t.fee === "number") {
                    setActiveTariff({
                        fee: safeNumber(t.fee, 0),
                        startsAt: t.startsAt ?? null,
                        endsAt: t.endsAt ?? null,
                    });
                    setGlobalFeeInput(String(Math.max(0, Math.round(Number(t.fee) || 0))));
                }
                else {
                    setActiveTariff(null);
                }
            }
            catch (e) {
                if (!alive)
                    return;
                setTariffError(e?.message || "Ошибка тарифа");
            }
            finally {
                if (!alive)
                    return;
                setTariffLoading(false);
            }
        };
        loadTariff();
        const t = setInterval(loadTariff, 15000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        let alive = true;
        const loadCommission = async () => {
            try {
                setCommissionLoading(true);
                const res = (await (0, api_1.apiFetch)(`/couriers/commission/default`));
                if (!alive)
                    return;
                const pct = Math.max(0, Math.min(100, Math.round(Number(res?.pct) || 0)));
                setGlobalCommissionPct(pct);
                setGlobalCommissionInput(String(pct));
            }
            catch {
            }
            finally {
                if (!alive)
                    return;
                setCommissionLoading(false);
            }
        };
        loadCommission();
        const t = setInterval(loadCommission, 20000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        let alive = true;
        let first = true;
        const loadCouriers = async () => {
            try {
                if (first) {
                    setLoading(true);
                    setError(null);
                }
                const data = (await (0, api_1.apiFetch)(`/couriers?page=1&limit=200`));
                if (!alive)
                    return;
                setCouriers(data?.items || []);
            }
            catch (e) {
                if (!alive)
                    return;
                if (first)
                    setError(e?.message || "Ошибка");
            }
            finally {
                if (!alive)
                    return;
                if (first)
                    setLoading(false);
            }
        };
        const loadSummary = async () => {
            try {
                if (first) {
                    setSummaryLoading(true);
                    setSummaryError(null);
                }
                const data = (await (0, api_1.apiFetch)(`/couriers/metrics/status-summary`));
                if (!alive)
                    return;
                setSummary(data);
            }
            catch (e) {
                if (!alive)
                    return;
                if (first)
                    setSummaryError(e?.message || "Ошибка метрик");
            }
            finally {
                if (!alive)
                    return;
                if (first)
                    setSummaryLoading(false);
            }
        };
        const tick = async () => {
            await Promise.all([loadCouriers(), loadSummary()]);
            first = false;
        };
        tick();
        const t = setInterval(tick, 5000);
        const onFocus = () => tick();
        window.addEventListener("focus", onFocus);
        return () => {
            alive = false;
            clearInterval(t);
            window.removeEventListener("focus", onFocus);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (!showStats || !statsExpanded)
            return;
        let alive = true;
        (async () => {
            setTimelineLoading(true);
            setTimelineError(null);
            try {
                const raw = (await (0, api_1.apiFetch)(`/couriers/metrics/online-timeline`));
                const items = Array.isArray(raw)
                    ? raw
                    : raw?.items
                        ? raw.items
                        : raw?.points
                            ? raw.points
                            : [];
                const mapped = (items || [])
                    .map((p) => ({
                    hour: typeof p?.hour === "number" ? p.hour : undefined,
                    time: p?.time != null ? String(p.time) : undefined,
                    ts: p?.ts != null ? String(p.ts) : undefined,
                    online: safeNumber(p?.online ?? p?.count ?? p?.value, 0),
                }))
                    .filter((p) => Number.isFinite(p.online));
                if (!alive)
                    return;
                setTimeline(mapped);
            }
            catch (e) {
                if (!alive)
                    return;
                setTimelineError(e?.message || "Нет данных (online-timeline)");
            }
            finally {
                if (!alive)
                    return;
                setTimelineLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [showStats, statsExpanded]);
    (0, react_1.useEffect)(() => {
        if (!showStats || !statsExpanded)
            return;
        let alive = true;
        (async () => {
            setSeriesLoading(true);
            setSeriesError(null);
            try {
                const raw = (await (0, api_1.apiFetch)(`/couriers/metrics/online-series`));
                const items = Array.isArray(raw)
                    ? raw
                    : raw?.items
                        ? raw.items
                        : raw?.series
                            ? raw.series
                            : [];
                const mapped = (items || [])
                    .map((p) => ({
                    bucket: p?.bucket != null ? String(p.bucket) : undefined,
                    seenUnique: p?.seenUnique != null ? safeNumber(p.seenUnique, 0) : undefined,
                    activeUnique: p?.activeUnique != null ? safeNumber(p.activeUnique, 0) : undefined,
                    date: p?.date != null
                        ? String(p.date)
                        : p?.day != null
                            ? String(p.day)
                            : p?.label != null
                                ? String(p.label)
                                : undefined,
                    online: p?.online != null ? safeNumber(p.online, 0) : undefined,
                    onlineAvg: p?.onlineAvg != null ? safeNumber(p.onlineAvg, 0) : undefined,
                }))
                    .filter((p) => !!p.bucket || !!p.date);
                if (!alive)
                    return;
                setSeries(mapped);
            }
            catch (e) {
                if (!alive)
                    return;
                setSeriesError(e?.message || "Нет данных (online-series)");
            }
            finally {
                if (!alive)
                    return;
                setSeriesLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [showStats, statsExpanded]);
    const rows = (0, react_1.useMemo)(() => couriers ?? [], [couriers]);
    const filtered = (0, react_1.useMemo)(() => {
        const query = norm(q);
        return rows.filter((c) => {
            const active = (c.isActive ?? true) === true;
            if (activeFilter === "active" && !active)
                return false;
            if (activeFilter === "blocked" && active)
                return false;
            if (onlineFilter === "online" && !c.isOnline)
                return false;
            if (onlineFilter === "offline" && c.isOnline)
                return false;
            if (!query)
                return true;
            const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
            const hay = norm([c.phone, c.iin, fullName].join(" "));
            return hay.includes(query);
        });
    }, [rows, q, onlineFilter, activeFilter]);
    const counts = (0, react_1.useMemo)(() => {
        const total = rows.length;
        const online = rows.filter((c) => c.isOnline).length;
        const offline = total - online;
        const active = rows.filter((c) => (c.isActive ?? true) === true).length;
        const blocked = total - active;
        return { total, online, offline, active, blocked };
    }, [rows]);
    const stat = (0, react_1.useMemo)(() => {
        const s = summary;
        const total = s?.total ?? counts.total;
        const online = s?.online ?? counts.online;
        const offline = s?.offline ?? counts.offline;
        const busy = s?.busy ?? 0;
        const active = counts.active;
        const blocked = counts.blocked;
        return { total, online, offline, busy, active, blocked };
    }, [summary, counts]);
    const pieSeries = (0, react_1.useMemo)(() => [stat.online, stat.offline, stat.busy], [stat]);
    const pieLabels = (0, react_1.useMemo)(() => ["На линии", "Оффлайн", "На заказе"], []);
    const pieOptions = (0, react_1.useMemo)(() => {
        const seriesRef = pieSeries;
        return {
            chart: { type: "pie", toolbar: { show: false }, animations: { enabled: true } },
            labels: pieLabels,
            colors: ["#16a34a", "#dc2626", "#f59e0b"],
            stroke: { show: true, width: 2, colors: ["#ffffff"] },
            legend: { show: false },
            dataLabels: {
                enabled: true,
                style: { fontSize: "12px", fontWeight: 900, colors: ["#111111"] },
                dropShadow: { enabled: false },
                formatter: function (val, opts) {
                    const i = opts.seriesIndex;
                    const label = opts.w.globals.labels[i];
                    const count = Number(seriesRef[i] ?? 0);
                    const pct = Math.round(val);
                    return `${label}\n${pct}%\n${count}`;
                },
            },
            plotOptions: {
                pie: { expandOnClick: false, dataLabels: { offset: 10, minAngleToShowLabel: 5 } },
            },
            tooltip: {
                y: {
                    formatter: (value, opts) => {
                        const total = opts?.w?.globals?.seriesTotals?.reduce((a, b) => a + b, 0) ?? 0;
                        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${value} (${pct}%)`;
                    },
                },
            },
        };
    }, [pieSeries, pieLabels]);
    const timelineChart = (0, react_1.useMemo)(() => {
        const labels = timeline.length > 0
            ? timeline.map((p, idx) => {
                if (typeof p.hour === "number")
                    return `${String(p.hour).padStart(2, "0")}:00`;
                if (p.time)
                    return String(p.time);
                if (p.ts) {
                    const d = new Date(p.ts);
                    if (!Number.isNaN(d.getTime())) {
                        const hh = String(d.getHours()).padStart(2, "0");
                        return `${hh}:00`;
                    }
                    return p.ts;
                }
                return String(idx + 1);
            })
            : [];
        const values = timeline.length > 0 ? timeline.map((p) => safeNumber(p.online, 0)) : [];
        return {
            series: [{ name: "На линии", data: values }],
            options: {
                chart: { type: "area", toolbar: { show: false }, sparkline: { enabled: false } },
                dataLabels: { enabled: false },
                stroke: { curve: "smooth", width: 2 },
                xaxis: { categories: labels, labels: { rotate: -45 } },
                yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
                tooltip: { x: { show: true } },
            },
        };
    }, [timeline]);
    const seriesChart = (0, react_1.useMemo)(() => {
        const hasNew = series.some((p) => p.bucket && (p.seenUnique != null || p.activeUnique != null));
        if (hasNew) {
            const labels = series.length > 0
                ? series.map((p) => {
                    const key = p.bucket ?? p.date ?? "";
                    if (!key)
                        return "";
                    const d = new Date(key);
                    if (!Number.isNaN(d.getTime()))
                        return d.toISOString().slice(0, 10);
                    return key;
                })
                : [];
            const seen = series.map((p) => safeNumber(p.seenUnique ?? 0, 0));
            const active = series.map((p) => safeNumber(p.activeUnique ?? 0, 0));
            return {
                series: [
                    { name: "Видимые (lastSeen)", data: seen },
                    { name: "Активные (lastActive)", data: active },
                ],
                options: {
                    chart: { type: "line", toolbar: { show: false } },
                    dataLabels: { enabled: false },
                    stroke: { curve: "smooth", width: 2 },
                    xaxis: { categories: labels, labels: { rotate: -45 } },
                    yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
                    tooltip: { x: { show: true } },
                    legend: { show: true },
                },
            };
        }
        const labels = series.length > 0 ? series.map((p) => p.date ?? "") : [];
        const values = series.length > 0 ? series.map((p) => safeNumber(p.onlineAvg ?? p.online ?? 0, 0)) : [];
        return {
            series: [{ name: "На линии (среднее)", data: values }],
            options: {
                chart: { type: "line", toolbar: { show: false } },
                dataLabels: { enabled: false },
                stroke: { curve: "smooth", width: 2 },
                xaxis: { categories: labels, labels: { rotate: -45 } },
                yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
                tooltip: { x: { show: true } },
            },
        };
    }, [series]);
    const openGlobalTariffModal = () => {
        const fee = activeTariff?.fee ?? 0;
        setGlobalFeeInput(String(Math.max(0, Math.round(Number(fee) || 0))));
        setShowTariffModal(true);
    };
    const openGlobalCommissionModal = () => {
        setGlobalCommissionInput(String(globalCommissionPct ?? 0));
        setShowCommissionModal(true);
    };
    const openCourierTariffModal = (c) => {
        setTariffCourier(c);
        const hasOverride = c.personalFeeOverride != null;
        setCourierUseGlobal(!hasOverride);
        if (hasOverride) {
            setCourierFeeInput(String(Math.max(0, Math.round(Number(c.personalFeeOverride) || 0))));
        }
        else {
            const base = activeTariff?.fee ?? 0;
            setCourierFeeInput(String(Math.max(0, Math.round(Number(base) || 0))));
        }
        setShowCourierTariffModal(true);
    };
    const refreshCouriersOnce = async () => {
        const data = (await (0, api_1.apiFetch)(`/couriers?page=1&limit=200`));
        setCouriers(data?.items || []);
    };
    const refreshTariffOnce = async () => {
        const t = (await (0, api_1.apiFetch)(`/couriers/tariff/active`));
        if (t && typeof t.fee === "number") {
            setActiveTariff({
                fee: safeNumber(t.fee, 0),
                startsAt: t.startsAt ?? null,
                endsAt: t.endsAt ?? null,
            });
            setGlobalFeeInput(String(Math.max(0, Math.round(Number(t.fee) || 0))));
        }
        else {
            setActiveTariff(null);
        }
    };
    const refreshCommissionOnce = async () => {
        const res = (await (0, api_1.apiFetch)(`/couriers/commission/default`));
        const pct = Math.max(0, Math.min(100, Math.round(Number(res?.pct) || 0)));
        setGlobalCommissionPct(pct);
        setGlobalCommissionInput(String(pct));
    };
    const saveGlobalTariff = async () => {
        const fee = Math.max(0, Math.round(Number(globalFeeInput) || 0));
        if (!fee) {
            setTariffError("fee must be > 0");
            return;
        }
        try {
            setTariffSaving(true);
            setTariffError(null);
            await (0, api_1.apiFetch)(`/couriers/tariff`, {
                method: "POST",
                body: JSON.stringify({ fee }),
            });
            await refreshTariffOnce();
            setShowTariffModal(false);
        }
        catch (e) {
            setTariffError(e?.message || "Ошибка сохранения тарифа");
        }
        finally {
            setTariffSaving(false);
        }
    };
    const saveGlobalCommission = async () => {
        const pct = Math.max(0, Math.min(100, Math.round(Number(globalCommissionInput) || 0)));
        try {
            setTariffSaving(true);
            setTariffError(null);
            await (0, api_1.apiFetch)(`/couriers/commission/default`, {
                method: "POST",
                body: JSON.stringify({ pct }),
            });
            await refreshCommissionOnce();
            setShowCommissionModal(false);
        }
        catch (e) {
            setTariffError(e?.message || "Ошибка сохранения комиссии");
        }
        finally {
            setTariffSaving(false);
        }
    };
    const saveCourierTariff = async () => {
        if (!tariffCourier)
            return;
        try {
            setTariffSaving(true);
            setTariffError(null);
            if (courierUseGlobal) {
                await (0, api_1.apiFetch)(`/couriers/${tariffCourier.id}/personal-fee`, {
                    method: "PATCH",
                    body: JSON.stringify({ fee: null }),
                });
            }
            else {
                const fee = Math.max(0, Math.round(Number(courierFeeInput) || 0));
                if (!fee) {
                    setTariffError("fee must be > 0");
                    setTariffSaving(false);
                    return;
                }
                await (0, api_1.apiFetch)(`/couriers/${tariffCourier.id}/personal-fee`, {
                    method: "PATCH",
                    body: JSON.stringify({ fee }),
                });
            }
            await refreshCouriersOnce();
            setShowCourierTariffModal(false);
            setTariffCourier(null);
        }
        catch (e) {
            setTariffError(e?.message || "Ошибка сохранения тарифа курьера");
        }
        finally {
            setTariffSaving(false);
        }
    };
    if (loading)
        return <div className="p-4">Загрузка...</div>;
    if (error)
        return <div className="p-4 text-danger">{error}</div>;
    return (<div ref={rootRef} className="container-fluid couriers-page">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h2 className="mb-1">Курьеры</h2>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Всего: <b>{counts.total}</b> · Онлайн: <b>{counts.online}</b> · Оффлайн:{" "}
            <b>{counts.offline}</b> · Заблок.: <b>{counts.blocked}</b>
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <input className="form-control couriers-search" style={{ width: 360 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: телефон / имя / ИИН"/>

          <select className="form-select" style={{ width: 210 }} value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="all">Все</option>
            <option value="active">Только активные</option>
            <option value="blocked">Только заблок.</option>
          </select>

          <select className="form-select" style={{ width: 190 }} value={onlineFilter} onChange={(e) => setOnlineFilter(e.target.value)}>
            <option value="all">Все</option>
            <option value="online">Только онлайн</option>
            <option value="offline">Только оффлайн</option>
          </select>

          <button className="btn btn-light" onClick={() => {
            setQ("");
            setOnlineFilter("all");
            setActiveFilter("all");
        }}>
            Сброс
          </button>

          <button className={`btn ${showStats ? "btn-outline-secondary" : "btn-secondary"}`} onClick={() => setShowStats((v) => !v)} title="Скрыть/показать статистику">
            {showStats ? "Скрыть статистику" : "Показать статистику"}
          </button>
        </div>
      </div>

      <div className={`split-screen ${showStats ? "with-stats" : "no-stats"}`}>
        
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
                    <th style={{ width: 56 }}/>
                    <th className="text-nowrap">Имя / Фамилия</th>
                    <th className="text-nowrap">ИИН</th>
                    <th className="text-nowrap">Статус</th>
                    <th className="text-nowrap">Телефон</th>
                    <th className="text-nowrap">Онлайн</th>

                    <th className="text-nowrap">Тариф</th>
                    <th className="text-nowrap">Комиссия</th>

                    <th className="text-nowrap text-end" style={{ width: 170 }}>
                      Действия
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (<tr>
                      <td colSpan={9} className="text-muted py-4">
                        Ничего не найдено
                      </td>
                    </tr>) : (filtered.map((c) => {
            const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "-";
            const isSelected = selectedId === c.id;
            const active = (c.isActive ?? true) === true;
            const onlineMain = c.isOnline
                ? `На линии · ${formatDurationHM(c.onlineForSec)}`
                : `Оффлайн · был ${formatAgoHM(c.lastSeenAt ?? c.lastActiveAt)} назад`;
            const offlineSub = !c.isOnline && c.lastSessionSec != null
                ? `последняя сессия: ${formatDurationHM(c.lastSessionSec)}`
                : null;
            const isIndTariff = c.personalFeeOverride != null;
            const shownFee = isIndTariff ? c.personalFeeOverride : activeTariff?.fee ?? null;
            const isIndComm = c.courierCommissionPctOverride != null;
            const shownPct = isIndComm ? c.courierCommissionPctOverride : globalCommissionPct;
            const avatarSrc = resolveAvatarSrc(c.avatarUrl);
            return (<tr key={c.id} onMouseEnter={() => setSelectedId(c.id)} onMouseLeave={() => setSelectedId(null)} onClick={() => router.push(`/layout-20/couriers/${c.userId}`)} style={{ cursor: "pointer" }} className={isSelected ? "row-selected" : ""} title="Открыть карточку курьера">
                          <td>
                            <div className="avatar-circle">
                              {avatarSrc ? (<img src={avatarSrc} alt="avatar" style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 999,
                        display: "block",
                    }}/>) : (initials(c.firstName, c.lastName))}
                            </div>
                          </td>

                          <td className="text-nowrap">{fullName}</td>
                          <td className="text-nowrap">{c.iin || "-"}</td>

                          <td className="text-nowrap">
                            <span className={`badge ${active
                    ? "bg-success-subtle text-success"
                    : "bg-danger-subtle text-danger"}`}>
                              {active ? "Активный" : "Заблокирован"}
                            </span>
                          </td>

                          <td className="text-nowrap">{c.phone || "-"}</td>

                          <td className="text-nowrap">
                            <div className={`online-cell ${c.isOnline ? "online-on" : "online-off"}`}>
                              <div className="online-row">
                                <span className={`dot ${c.isOnline ? "dot-green" : "dot-red"}`}>●</span>
                                <span className="online-main">{onlineMain}</span>
                              </div>
                              {offlineSub ? <div className="online-sub">{offlineSub}</div> : null}
                            </div>
                          </td>

                          
                          <td className="text-nowrap">
                            <div className="tariff-cell">
                              <div className="d-flex align-items-center gap-2">
                                <span className={`badge ${isIndTariff
                    ? "bg-primary-subtle text-primary"
                    : "bg-secondary-subtle text-dark"}`}>
                                  {isIndTariff ? "Инд." : "Общий"}
                                </span>
                                <span className="tariff-fee">{moneyKZT(shownFee)}</span>
                              </div>

                              <button className="btn btn-sm btn-light mt-1" onClick={(e) => {
                    e.stopPropagation();
                    openCourierTariffModal(c);
                }} title="Изменить тариф курьера">
                                Изменить
                              </button>
                            </div>
                          </td>

                          
                          <td className="text-nowrap">
                            <div className="tariff-cell">
                              <div className="d-flex align-items-center gap-2">
                                <span className={`badge ${isIndComm
                    ? "bg-primary-subtle text-primary"
                    : "bg-secondary-subtle text-dark"}`}>
                                  {isIndComm ? "Инд." : "Общий"}
                                </span>
                                <span className="tariff-fee">{pctText(shownPct)}</span>
                              </div>

                              <div className="text-muted mt-1" style={{ fontSize: 12, fontWeight: 800 }}>
                                от тарифа: <b>{commissionAmountKZT(shownFee, shownPct)}</b>
                              </div>
                            </div>
                          </td>

                          <td className="text-end">
                            <button className="btn btn-sm btn-outline-primary" onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/layout-20/couriers/${c.userId}`);
                }}>
                              Редактировать
                            </button>
                          </td>
                        </tr>);
        }))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {showStats ? (<section className="pane tariff-pane">
            <header className="pane-header">
              <div>
                <div className="pane-title">Тарификация</div>
                <div className="pane-sub text-muted">
                  {tariffLoading ? "обновление…" : activeTariff ? "активный тариф" : "—"}
                  {tariffError ? (<span className="ms-2 text-danger" style={{ fontWeight: 800 }}>
                      {tariffError}
                    </span>) : null}
                </div>
              </div>

              <button className="btn btn-sm btn-outline-primary" onClick={openGlobalTariffModal} title="Изменить тариф для всех">
                Для всех
              </button>
            </header>

            <div className="pane-body">
              
              <div className="tariff-card">
                <div className="tariff-label">Тариф по умолчанию (выплата курьеру)</div>
                <div className="tariff-value">{activeTariff ? moneyKZT(activeTariff.fee) : "—"}</div>

                <div className="tariff-meta text-muted">
                  {activeTariff?.startsAt ? (<div>
                      Начало: <b>{String(activeTariff.startsAt).slice(0, 19).replace("T", " ")}</b>
                    </div>) : null}
                  {activeTariff?.endsAt ? (<div>
                      Конец: <b>{String(activeTariff.endsAt).slice(0, 19).replace("T", " ")}</b>
                    </div>) : null}
                </div>

                <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
                  <button className="btn btn-sm btn-primary" onClick={openGlobalTariffModal} disabled={tariffSaving}>
                    Изменить для всех
                  </button>

                  <button className="btn btn-sm btn-light" onClick={async () => {
                try {
                    setTariffError(null);
                    await refreshTariffOnce();
                }
                catch (e) {
                    setTariffError(e?.message || "Ошибка обновления тарифа");
                }
            }} disabled={tariffSaving}>
                    Обновить
                  </button>
                </div>

                <div className="text-muted mt-3" style={{ fontSize: 12, lineHeight: 1.35 }}>
                  Индивидуальный тариф задаётся в строке курьера (столбец “Тариф” → “Изменить”). Если
                  индивидуальный не задан — применяется общий.
                </div>
              </div>

              
              <div className="tariff-card mt-3">
                <div className="tariff-label">Комиссия сервиса (по умолчанию)</div>
                <div className="tariff-value">
                  {commissionLoading ? "…" : pctText(globalCommissionPct)}
                </div>

                <div className="text-muted mt-2" style={{ fontSize: 12, lineHeight: 1.35 }}>
                  Считается от выплаты курьеру: <b>commission = round(fee * pct / 100)</b>.
                  Индивидуальный override комиссии задаётся в карточке курьера (как у тебя уже сделано).
                </div>

                <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
                  <button className="btn btn-sm btn-primary" onClick={openGlobalCommissionModal} disabled={tariffSaving}>
                    Изменить для всех
                  </button>

                  <button className="btn btn-sm btn-light" onClick={async () => {
                try {
                    setTariffError(null);
                    await refreshCommissionOnce();
                }
                catch (e) {
                    setTariffError(e?.message || "Ошибка обновления комиссии");
                }
            }} disabled={tariffSaving}>
                    Обновить
                  </button>
                </div>
              </div>
            </div>
          </section>) : null}

        {showStats ? (<section className="pane right-pane">
            <header className="pane-header">
              <div>
                <div className="pane-title">Статистика</div>
                <div className="pane-sub text-muted">
                  {summaryLoading ? "обновление…" : summary?.generatedAt ? "готово" : "—"}
                  {summaryError ? (<span className="ms-2 text-danger" style={{ fontWeight: 800 }}>
                      {summaryError}
                    </span>) : null}
                </div>
              </div>

              <button className="btn btn-sm btn-light" onClick={() => setStatsExpanded((v) => !v)} title="Показать/скрыть графики">
                {statsExpanded ? "Скрыть графики" : "Графики"}
              </button>
            </header>

            <div className="pane-body">
              <div className="stats-mini">
                <div className="mini-card">
                  <div className="mini-label">Всего</div>
                  <div className="mini-value">{stat.total}</div>
                </div>
                <div className="mini-card">
                  <div className="mini-label">На линии</div>
                  <div className="mini-value">{stat.online}</div>
                </div>
                <div className="mini-card">
                  <div className="mini-label">Оффлайн</div>
                  <div className="mini-value">{stat.offline}</div>
                </div>
                <div className="mini-card">
                  <div className="mini-label">Активные</div>
                  <div className="mini-value">{stat.active}</div>
                </div>
                <div className="mini-card">
                  <div className="mini-label">Заблок.</div>
                  <div className="mini-value">{stat.blocked}</div>
                </div>
                <div className="mini-card">
                  <div className="mini-label">На заказе</div>
                  <div className="mini-value">{stat.busy}</div>
                </div>
              </div>

              {statsExpanded ? (<div className="stats-expanded">
                  <div className="chart-card">
                    <div className="chart-title">Статусы курьеров</div>
                    <div className="pie-wrap small">
                      <ReactApexChart options={pieOptions} series={pieSeries} type="pie" height={220}/>
                    </div>
                  </div>

                  <div className="chart-card">
                    <div className="chart-title d-flex align-items-center justify-content-between">
                      <span>На линии по часам</span>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {timelineLoading ? "загрузка…" : timeline.length ? "готово" : "—"}
                      </span>
                    </div>

                    {timelineError ? (<div className="text-muted" style={{ fontSize: 13 }}>
                        {timelineError}
                      </div>) : null}

                    {timeline.length ? (<ReactApexChart options={timelineChart.options} series={timelineChart.series} type="area" height={160}/>) : (<div className="chart-placeholder">Нет данных</div>)}
                  </div>

                  <div className="chart-card">
                    <div className="chart-title d-flex align-items-center justify-content-between">
                      <span>Онлайн по дням</span>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {seriesLoading ? "загрузка…" : series.length ? "готово" : "—"}
                      </span>
                    </div>

                    {seriesError ? (<div className="text-muted" style={{ fontSize: 13 }}>
                        {seriesError}
                      </div>) : null}

                    {series.length ? (<ReactApexChart options={seriesChart.options} series={seriesChart.series} type="line" height={160}/>) : (<div className="chart-placeholder">Нет данных</div>)}
                  </div>
                </div>) : null}
            </div>
          </section>) : null}
      </div>

      
      {showTariffModal ? (<div className="simple-modal-backdrop" onClick={() => setShowTariffModal(false)}>
          <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
            <div className="simple-modal-header">
              <div className="simple-modal-title">Тариф для всех</div>
              <button className="btn btn-sm btn-light" onClick={() => setShowTariffModal(false)}>
                ✕
              </button>
            </div>

            <div className="simple-modal-body">
              <div className="text-muted" style={{ fontSize: 13 }}>
                Установит новый активный тариф (выплата курьеру) для всех заказов (по умолчанию). Индивидуальные
                переопределения у курьеров сохраняются.
              </div>

              <div className="mt-3">
                <label className="form-label fw-bold">Выплата курьеру (₸)</label>
                <input className="form-control" type="number" min={0} value={globalFeeInput} onChange={(e) => setGlobalFeeInput(e.target.value)} placeholder="Например: 1500"/>
              </div>

              {tariffError ? (<div className="text-danger mt-2" style={{ fontWeight: 800 }}>
                  {tariffError}
                </div>) : null}
            </div>

            <div className="simple-modal-footer">
              <button className="btn btn-light" onClick={() => setShowTariffModal(false)} disabled={tariffSaving}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={saveGlobalTariff} disabled={tariffSaving}>
                {tariffSaving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>) : null}

      
      {showCommissionModal ? (<div className="simple-modal-backdrop" onClick={() => setShowCommissionModal(false)}>
          <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
            <div className="simple-modal-header">
              <div className="simple-modal-title">Комиссия для всех</div>
              <button className="btn btn-sm btn-light" onClick={() => setShowCommissionModal(false)}>
                ✕
              </button>
            </div>

            <div className="simple-modal-body">
              <div className="text-muted" style={{ fontSize: 13 }}>
                Это глобальная комиссия сервиса (процент) от выплаты курьеру. Индивидуальные override у курьеров
                сохраняются.
              </div>

              <div className="mt-3">
                <label className="form-label fw-bold">Комиссия (%)</label>
                <input className="form-control" type="number" min={0} max={100} value={globalCommissionInput} onChange={(e) => setGlobalCommissionInput(e.target.value)} placeholder="Например: 15"/>
              </div>

              {tariffError ? (<div className="text-danger mt-2" style={{ fontWeight: 800 }}>
                  {tariffError}
                </div>) : null}
            </div>

            <div className="simple-modal-footer">
              <button className="btn btn-light" onClick={() => setShowCommissionModal(false)} disabled={tariffSaving}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={saveGlobalCommission} disabled={tariffSaving}>
                {tariffSaving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>) : null}

      
      {showCourierTariffModal ? (<div className="simple-modal-backdrop" onClick={() => setShowCourierTariffModal(false)}>
          <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
            <div className="simple-modal-header">
              <div className="simple-modal-title">Тариф курьера</div>
              <button className="btn btn-sm btn-light" onClick={() => {
                setShowCourierTariffModal(false);
                setTariffCourier(null);
            }}>
                ✕
              </button>
            </div>

            <div className="simple-modal-body">
              <div className="text-muted" style={{ fontSize: 13 }}>
                Курьер:{" "}
                <b>
                  {tariffCourier
                ? `${tariffCourier.firstName ?? ""} ${tariffCourier.lastName ?? ""}`.trim() || tariffCourier.phone
                : "—"}
                </b>
              </div>

              <div className="mt-3">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" checked={courierUseGlobal} onChange={(e) => setCourierUseGlobal(e.target.checked)} id="useGlobalTariff"/>
                  <label className="form-check-label fw-bold" htmlFor="useGlobalTariff">
                    Использовать общий тариф
                  </label>
                </div>

                <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                  Общий тариф сейчас: <b>{activeTariff ? moneyKZT(activeTariff.fee) : "—"}</b>
                </div>
              </div>

              {!courierUseGlobal ? (<div className="mt-3">
                  <label className="form-label fw-bold">Индивидуальная выплата (₸)</label>
                  <input className="form-control" type="number" min={0} value={courierFeeInput} onChange={(e) => setCourierFeeInput(e.target.value)} placeholder="Например: 1800"/>
                </div>) : null}

              {tariffError ? (<div className="text-danger mt-2" style={{ fontWeight: 800 }}>
                  {tariffError}
                </div>) : null}
            </div>

            <div className="simple-modal-footer">
              <button className="btn btn-light" onClick={() => {
                setShowCourierTariffModal(false);
                setTariffCourier(null);
            }} disabled={tariffSaving}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={saveCourierTariff} disabled={tariffSaving}>
                {tariffSaving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>) : null}

      <style jsx global>{`
        .couriers-page,
        .couriers-page * {
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .couriers-page .text-muted {
          color: rgba(17, 24, 39, 0.78) !important;
          opacity: 1 !important;
        }

        .couriers-page .pane-sub,
        .couriers-page .mini-label,
        .couriers-page .tariff-label {
          color: rgba(17, 24, 39, 0.75) !important;
          opacity: 1 !important;
        }

        .couriers-page {
          height: calc(100vh - 120px);
          min-height: 560px;
          overflow: hidden;
        }

        .split-screen {
          height: 100%;
          min-height: 0;
          display: grid;
          gap: 16px;
        }

        .split-screen.with-stats {
          grid-template-columns: 1fr 360px 420px;
        }
        .split-screen.no-stats {
          grid-template-columns: 1fr;
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
          font-weight: 700;
        }

        .pane-body {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          overscroll-behavior: contain;
          padding: 10px 12px;
        }

        .couriers-search {
          border: 2px solid rgba(0, 0, 0, 0.35) !important;
          font-weight: 700;
        }
        .couriers-search:focus {
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15) !important;
          border-color: rgba(13, 110, 253, 0.65) !important;
        }

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
          color: rgba(17, 24, 39, 0.92);
          font-weight: 700;
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
          overflow: hidden;
        }

        .dot {
          font-weight: 900;
          margin-right: 6px;
        }
        .dot-green {
          color: #18a34a;
        }
        .dot-red {
          color: #dc2626;
        }

        .online-cell {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .online-row {
          display: flex;
          align-items: center;
          white-space: nowrap;
        }
        .online-main {
          font-weight: 900;
          color: #111;
        }
        .online-off .online-main {
          color: rgba(17, 24, 39, 0.9);
          font-weight: 900;
        }
        .online-sub {
          margin-left: 16px;
          margin-top: 2px;
          font-size: 12px;
          color: rgba(17, 24, 39, 0.72);
          font-weight: 800;
          white-space: nowrap;
        }

        .tariff-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.2;
        }
        .tariff-fee {
          font-weight: 950;
          color: #111;
          letter-spacing: 0.2px;
        }

        .tariff-card {
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .tariff-label {
          font-size: 12px;
          font-weight: 800;
        }
        .tariff-value {
          font-size: 22px;
          font-weight: 950;
          color: #111;
          margin-top: 4px;
          line-height: 1.1;
        }
        .tariff-meta {
          font-size: 12px;
          margin-top: 10px;
          line-height: 1.35;
        }

        .stats-mini {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 10px;
        }
        .mini-card {
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 10px 10px;
          background: #fff;
        }
        .mini-label {
          font-size: 12px;
          font-weight: 800;
        }
        .mini-value {
          font-size: 18px;
          font-weight: 950;
          color: #111;
          line-height: 1.1;
          margin-top: 2px;
        }

        .stats-expanded .chart-card {
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

        .chart-placeholder {
          height: 90px;
          border-radius: 10px;
          border: 1px dashed rgba(0, 0, 0, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(17, 24, 39, 0.72);
          font-size: 13px;
          font-weight: 800;
          padding: 10px;
          text-align: center;
        }

        .simple-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 18px;
        }
        .simple-modal {
          width: 540px;
          max-width: calc(100vw - 24px);
          background: #fff;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .simple-modal-header {
          padding: 12px 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .simple-modal-title {
          font-weight: 950;
          color: #111;
        }
        .simple-modal-body {
          padding: 12px 12px;
          color: rgba(17, 24, 39, 0.92);
          font-weight: 700;
        }
        .simple-modal-footer {
          padding: 12px 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        @media (max-width: 1400px) {
          .split-screen.with-stats {
            grid-template-columns: 1fr 360px;
          }
          .right-pane {
            display: none;
          }
        }

        @media (max-width: 1200px) {
          .split-screen.with-stats {
            grid-template-columns: 1fr;
          }
          .tariff-pane {
            display: none;
          }
        }
      `}</style>
    </div>);
}
//# sourceMappingURL=page.js.map