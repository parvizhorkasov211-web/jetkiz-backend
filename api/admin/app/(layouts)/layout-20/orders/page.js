"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OrdersPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const api_1 = require("@/lib/api");
function isDigitsOnly(v) {
    return /^[0-9]+$/.test(v);
}
function formatCourier(c) {
    if (!c)
        return "Не назначен";
    const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
    const phone = c.phone ? ` (${c.phone})` : "";
    return (name || "Курьер") + phone;
}
function formatRestaurant(r) {
    if (!r)
        return "-";
    return (r.nameRu ?? r.nameKk ?? "-");
}
function OrdersPage() {
    const router = (0, navigation_1.useRouter)();
    const [rows, setRows] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [q, setQ] = (0, react_1.useState)("");
    async function load() {
        const data = (await (0, api_1.apiFetch)(`/orders?limit=200`));
        const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
                ? data.items
                : Array.isArray(data?.data)
                    ? data.data
                    : [];
        setRows(list);
    }
    (0, react_1.useEffect)(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                await load();
            }
            catch (e) {
                if (!alive)
                    return;
                setError(e?.message || "Ошибка загрузки");
            }
            finally {
                if (!alive)
                    return;
                setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);
    const filtered = (0, react_1.useMemo)(() => {
        const s = q.trim().toLowerCase();
        if (!s)
            return rows;
        const sDigits = isDigitsOnly(s);
        return rows.filter((o) => {
            const id = (o.id ?? "").toLowerCase();
            const num = o.number == null ? "" : String(o.number);
            const phone = (o.phone ?? "").toLowerCase();
            const status = (o.status ?? "").toLowerCase();
            const rest = formatRestaurant(o.restaurant).toLowerCase();
            const cour = formatCourier(o.courier).toLowerCase();
            if (sDigits) {
                return num.includes(s) || phone.includes(s);
            }
            return (id.includes(s) ||
                num.includes(s) ||
                phone.includes(s) ||
                status.includes(s) ||
                rest.includes(s) ||
                cour.includes(s));
        });
    }, [rows, q]);
    const totalCount = rows.length;
    if (loading) {
        return (<div className="p-6">
        <div className="text-gray-600">Загрузка...</div>
      </div>);
    }
    if (error) {
        return (<div className="p-6">
        <div className="text-red-700 font-semibold mb-2">Ошибка</div>
        <div className="text-gray-800 mb-4">{error}</div>
        <button className="px-4 py-2 rounded bg-gray-900 text-white" onClick={() => router.refresh()}>
          Обновить
        </button>
      </div>);
    }
    return (<div className="p-6">
      <div className="mb-4">
        <div className="text-xl font-semibold">Заказы</div>
        <div className="text-sm text-gray-600">
          Всего: {totalCount}
        </div>
      </div>

      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
        <input className="w-full md:max-w-xl border rounded px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: № заказа / id / статус / телефон / ресторан / курьер"/>
        <button className="px-4 py-2 rounded bg-gray-100" onClick={() => {
            setQ("");
        }}>
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
            return (<tr key={o.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/layout-20/orders/${o.id}`)} title="Открыть заказ">
                  <td className="py-2 px-3 font-semibold">
                    
                    {orderNo != null ? (<span className="underline underline-offset-2">
                        {orderNo}
                      </span>) : (<span className="text-gray-400">—</span>)}
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
                </tr>);
        })}

            {!filtered.length && (<tr>
                <td className="py-6 px-3 text-gray-600" colSpan={7}>
                  Ничего не найдено
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Совет: ищи заказ по номеру (цифры). UUID оставлен как технич. поле.
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map