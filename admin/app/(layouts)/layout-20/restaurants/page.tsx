'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { apiFetch, API_URL } from '@/lib/api';

type RestaurantRow = {
  id: string;
  number?: number | null;
  nameRu: string;
  nameKk: string;
  status: string; // административный (OPEN/CLOSED/BLOCKED)
  isInApp?: boolean;
  runtimeStatus?: 'OPEN' | 'CLOSED'; // вычисляемый по времени
  workingHours?: string | null;
  phone?: string | null;
  address?: string | null;

  restaurantCommissionPctOverride?: number | null;
  effectiveRestaurantCommissionPct?: number;
};

type StatusFilter = 'ALL' | 'OPEN' | 'CLOSED';

function StatusPill({ runtimeStatus }: { runtimeStatus?: 'OPEN' | 'CLOSED' }) {
  const s = runtimeStatus ?? 'CLOSED';
  const cls =
    s === 'OPEN'
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-red-50 text-red-700 border-red-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md border font-extrabold text-[12px] ${cls}`}
    >
      {s}
    </span>
  );
}

function InAppToggle({
  value,
  disabled,
  onToggle,
}: {
  value?: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  const v = Boolean(value);

  const cls = v
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border font-extrabold text-[12px] ${cls} hover:opacity-90 disabled:opacity-50`}
      disabled={disabled}
      onClick={() => onToggle(!v)}
      title={v ? 'Ресторан включен в приложении' : 'Ресторан скрыт из приложения'}
    >
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${v ? 'bg-green-600' : 'bg-gray-400'}`}
      />
      {v ? 'ВКЛ' : 'ВЫКЛ'}
    </button>
  );
}

function CommissionPill({
  effectivePct,
  overridePct,
}: {
  effectivePct?: number;
  overridePct?: number | null;
}) {
  const pct = typeof effectivePct === 'number' ? effectivePct : 0;
  const isOverride = typeof overridePct === 'number';

  const cls = isOverride
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-gray-50 text-gray-800 border-gray-200';

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border font-extrabold text-[12px] ${cls}`}
      title={
        isOverride
          ? `Override комиссии ресторана: ${pct}%`
          : `Используется глобальный дефолт: ${pct}%`
      }
    >
      <span>{pct}%</span>
      {isOverride && <span className="text-[11px] font-black opacity-80">OVR</span>}
    </span>
  );
}

function toPctOrNull(raw: string): number | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 0 || i > 100) return null;
  return i;
}

export default function RestaurantsPage() {
  const router = useRouter();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const [items, setItems] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [commissionEditing, setCommissionEditing] = useState<Record<string, string>>({});
  const [commissionSavingId, setCommissionSavingId] = useState<string | null>(null);

  // ======================================================
  // ✅ GLOBAL RESTAURANT COMMISSION DEFAULT
  // ======================================================
  const [globalCommission, setGlobalCommission] = useState<string>(''); // input
  const [globalCommissionLoading, setGlobalCommissionLoading] = useState(false);
  const [globalCommissionSaving, setGlobalCommissionSaving] = useState(false);
  const [globalCommissionErr, setGlobalCommissionErr] = useState<string | null>(null);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status !== 'ALL') sp.set('status', status);
    return sp.toString();
  }, [q, status]);

  // ======================================================
  // LOAD: restaurants
  // ======================================================
  useEffect(() => {
    let alive = true;

    setLoading(true);
    setErr(null);

    apiFetch<any>(`/restaurants?${query}`, { method: 'GET' })
      .then((data) => {
        if (!alive) return;

        const list: RestaurantRow[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];

        setItems(list);

        setCommissionEditing((prev) => {
          const next = { ...prev };
          for (const r of list) {
            if (next[r.id] === undefined) {
              next[r.id] =
                typeof r.restaurantCommissionPctOverride === 'number'
                  ? String(r.restaurantCommissionPctOverride)
                  : '';
            }
          }
          return next;
        });
      })
      .catch((e: any) => {
        if (!alive) return;
        setItems([]);
        setErr(e?.message || 'Ошибка загрузки');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query]);

  // ======================================================
  // LOAD: global commission default
  // ======================================================
  useEffect(() => {
    let alive = true;

    setGlobalCommissionLoading(true);
    setGlobalCommissionErr(null);

    apiFetch<any>(`/restaurants/commission/default`, { method: 'GET' })
      .then((data) => {
        if (!alive) return;
        const v = data?.restaurantCommissionPctDefault;
        if (typeof v === 'number') {
          setGlobalCommission(String(v));
        } else {
          setGlobalCommission('');
        }
      })
      .catch((e: any) => {
        if (!alive) return;
        setGlobalCommissionErr(e?.message || 'Ошибка загрузки дефолтной комиссии');
      })
      .finally(() => {
        if (!alive) return;
        setGlobalCommissionLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const handleSaveGlobalCommission = async () => {
    try {
      setGlobalCommissionSaving(true);
      setGlobalCommissionErr(null);
      setErr(null);

      const pct = toPctOrNull(globalCommission);
      if (pct === null) {
        throw new Error('Комиссия должна быть числом от 0 до 100');
      }

      // ожидаемый body: { restaurantCommissionPctDefault: number }
      const updated = await apiFetch<any>(`/restaurants/commission/default`, {
        method: 'PATCH',
        body: JSON.stringify({ restaurantCommissionPctDefault: pct }),
      });

      const newDefault =
        typeof updated?.restaurantCommissionPctDefault === 'number'
          ? updated.restaurantCommissionPctDefault
          : pct;

      setGlobalCommission(String(newDefault));

      // опционально: обновим effectiveRestaurantCommissionPct в строках без override,
      // чтобы UI сразу показал новый дефолт (без рефетча списка)
      setItems((prev) =>
        prev.map((x) => {
          const hasOverride = typeof x.restaurantCommissionPctOverride === 'number';
          if (hasOverride) return x;
          return { ...x, effectiveRestaurantCommissionPct: newDefault };
        }),
      );
    } catch (e: any) {
      setGlobalCommissionErr(e?.message || 'Ошибка сохранения дефолтной комиссии');
    } finally {
      setGlobalCommissionSaving(false);
    }
  };

  const handleToggleInApp = async (id: string, next: boolean) => {
    try {
      setTogglingId(id);
      setErr(null);

      const updated = await apiFetch<any>(`/restaurants/${id}/in-app`, {
        method: 'PATCH',
        body: JSON.stringify({ isInApp: next }),
      });

      const newVal = typeof updated?.isInApp === 'boolean' ? updated.isInApp : next;

      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, isInApp: newVal } : x)));
    } catch (e: any) {
      setErr(e?.message || 'Ошибка обновления');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveCommission = async (id: string) => {
    try {
      setCommissionSavingId(id);
      setErr(null);

      const raw = (commissionEditing[id] ?? '').trim();

      // ✅ FIX: валидируем так же строго как global, чтобы не отправлять NaN / мусор
      let payload: { restaurantCommissionPctOverride: number | null };

      if (raw === '') {
        payload = { restaurantCommissionPctOverride: null };
      } else {
        const pct = toPctOrNull(raw);
        if (pct === null) {
          throw new Error('Комиссия должна быть числом от 0 до 100');
        }
        payload = { restaurantCommissionPctOverride: pct };
      }

      const updated = await apiFetch<any>(`/restaurants/${id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                restaurantCommissionPctOverride:
                  typeof updated?.restaurantCommissionPctOverride === 'number' ||
                  updated?.restaurantCommissionPctOverride === null
                    ? updated.restaurantCommissionPctOverride
                    : x.restaurantCommissionPctOverride,
                effectiveRestaurantCommissionPct:
                  typeof updated?.effectiveRestaurantCommissionPct === 'number'
                    ? updated.effectiveRestaurantCommissionPct
                    : x.effectiveRestaurantCommissionPct,
              }
            : x,
        ),
      );

      setCommissionEditing((prev) => ({
        ...prev,
        [id]:
          typeof updated?.restaurantCommissionPctOverride === 'number'
            ? String(updated.restaurantCommissionPctOverride)
            : '',
      }));
    } catch (e: any) {
      setErr(e?.message || 'Ошибка обновления комиссии');
    } finally {
      setCommissionSavingId(null);
    }
  };

  // ✅ FIX: сброс через endpoint reset (не зависит от setState)
  const handleResetCommission = async (id: string) => {
    try {
      setCommissionSavingId(id);
      setErr(null);

      const updated = await apiFetch<any>(`/restaurants/${id}/commission/reset`, {
        method: 'POST',
      });

      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                restaurantCommissionPctOverride:
                  typeof updated?.restaurantCommissionPctOverride === 'number' ||
                  updated?.restaurantCommissionPctOverride === null
                    ? updated.restaurantCommissionPctOverride
                    : null,
                effectiveRestaurantCommissionPct:
                  typeof updated?.effectiveRestaurantCommissionPct === 'number'
                    ? updated.effectiveRestaurantCommissionPct
                    : x.effectiveRestaurantCommissionPct,
              }
            : x,
        ),
      );

      setCommissionEditing((prev) => ({ ...prev, [id]: '' }));
    } catch (e: any) {
      setErr(e?.message || 'Ошибка сброса комиссии');
    } finally {
      setCommissionSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Удалить ресторан? Это действие нельзя отменить.');
    if (!ok) return;

    try {
      setDeletingId(id);
      setErr(null);

      await apiFetch(`/restaurants/${id}`, { method: 'DELETE' });

      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(e?.message || 'Ошибка удаления');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* ✅ Заголовок + глобальная комиссия рядом */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Рестораны</h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-extrabold text-gray-700 whitespace-nowrap">
                Общая комиссия ресторанов
              </span>

              <div className="flex items-center gap-2">
                <input
                  className="w-[90px] px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm font-extrabold text-[13px]"
                  placeholder="20"
                  value={globalCommission}
                  onChange={(e) => setGlobalCommission(e.target.value)}
                  disabled={globalCommissionLoading || globalCommissionSaving}
                  inputMode="numeric"
                  title="Дефолтная комиссия сервиса с ресторана (0..100)"
                />
                <span className="text-[13px] font-extrabold text-gray-600">%</span>

                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-gray-300 font-extrabold text-[13px] hover:bg-gray-50 disabled:opacity-50"
                  onClick={handleSaveGlobalCommission}
                  disabled={globalCommissionLoading || globalCommissionSaving}
                  title="Сохранить дефолтную комиссию"
                >
                  {globalCommissionSaving ? '...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {globalCommissionErr && (
          <div className="text-sm font-semibold text-red-600">{globalCommissionErr}</div>
        )}

        <div className="flex items-center gap-4">
          <input
            className="w-[420px] px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-black/30 transition font-semibold"
            placeholder="Поиск: номер или название"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white font-semibold shadow-sm"
          >
            <option value="ALL">Все</option>
            <option value="OPEN">Открытые (по времени)</option>
            <option value="CLOSED">Закрытые (по времени)</option>
          </select>

          {loading && <div className="text-sm font-semibold text-gray-600">Загрузка...</div>}
        </div>
      </div>

      {err && <div className="text-sm font-semibold text-red-600">{err}</div>}

      <div className="overflow-auto rounded-xl border border-gray-300 bg-white">
        {/* ✅ FIX layout: делаем таблицу авто-раскладкой + увеличиваем min-width */}
        <table className="min-w-[2000px] w-full text-[15px] table-auto">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="text-left p-4 font-bold text-gray-900 w-[110px] whitespace-nowrap">
                №
              </th>

              <th className="text-left p-4 font-bold text-gray-900 w-[260px]">Название (RU)</th>
              <th className="text-left p-4 font-bold text-gray-900 w-[260px]">Название (KZ)</th>

              <th className="text-left p-4 font-bold text-gray-900 w-[170px]">Статус</th>

              <th className="text-left p-4 font-bold text-gray-900 w-[140px] whitespace-nowrap">
                Время работы
              </th>

              <th className="text-left p-4 font-bold text-gray-900 w-[160px] whitespace-nowrap">
                Телефон
              </th>

              <th className="text-left p-4 font-bold text-gray-900 w-[280px]">Адрес</th>

              {/* ✅ FIX: комиссия шире, чтобы не переносилось */}
              <th className="text-left p-4 font-bold text-gray-900 w-[360px] whitespace-nowrap">
                Комиссия
              </th>

              <th className="text-left p-4 font-bold text-gray-900 w-[160px] whitespace-nowrap sticky right-[80px] bg-gray-100 border-l border-gray-300 z-10">
                В приложении
              </th>

              <th className="text-right p-4 font-bold text-gray-900 w-[80px] whitespace-nowrap sticky right-0 bg-gray-100 border-l border-gray-300 z-20">
                Удалить
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((x, index) => {
              const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
              const commissionInput = commissionEditing[x.id] ?? '';

              return (
                <tr
                  key={x.id}
                  className={`border-t border-gray-200 cursor-pointer transition ${rowBg} hover:bg-gray-100`}
                  onClick={() => router.push(`/layout-20/restaurants/${x.id}`)}
                >
                  <td className="p-4 w-[110px] whitespace-nowrap font-mono font-black text-[17px] text-gray-900">
                    {typeof x.number === 'number' ? `#${x.number}` : '—'}
                  </td>

                  <td className="p-4 font-extrabold text-gray-900 text-[16px]">{x.nameRu}</td>

                  <td className="p-4 font-extrabold text-gray-900 text-[16px]">{x.nameKk}</td>

                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <StatusPill runtimeStatus={x.runtimeStatus} />
                      {x.status !== 'OPEN' && (
                        <span className="text-[12px] font-bold text-gray-600">
                          admin: {x.status}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-4 font-semibold text-gray-800 whitespace-nowrap">
                    {x.workingHours ?? '-'}
                  </td>

                  <td className="p-4 font-semibold text-gray-800 whitespace-nowrap">
                    {x.phone ?? '-'}
                  </td>

                  <td className="p-4 font-semibold text-gray-800">{x.address ?? '-'}</td>

                  {/* ✅ Комиссия */}
                  <td
                    className="p-4 whitespace-nowrap"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {/* ✅ FIX: flex-nowrap + min-w чтобы кнопки не “сбегали” */}
                    <div className="flex items-center gap-3 flex-nowrap min-w-[360px]">
                      <CommissionPill
                        effectivePct={x.effectiveRestaurantCommissionPct}
                        overridePct={x.restaurantCommissionPctOverride}
                      />

                      <div className="flex items-center gap-2 flex-nowrap">
                        <input
                          className="w-[70px] px-2 py-1 border border-gray-300 rounded-md font-bold text-[13px] bg-white"
                          placeholder="—"
                          value={commissionInput}
                          onChange={(e) =>
                            setCommissionEditing((prev) => ({
                              ...prev,
                              [x.id]: e.target.value,
                            }))
                          }
                          title="Override комиссии (пусто = использовать дефолт)"
                        />
                        <span className="text-[12px] font-extrabold text-gray-600">%</span>

                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-md border border-gray-300 font-extrabold text-[12px] hover:bg-gray-50 disabled:opacity-50"
                          disabled={commissionSavingId === x.id}
                          onClick={() => handleSaveCommission(x.id)}
                          title="Сохранить override"
                        >
                          OK
                        </button>

                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-md border border-gray-300 font-extrabold text-[12px] hover:bg-gray-50 disabled:opacity-50"
                          disabled={commissionSavingId === x.id}
                          onClick={() => handleResetCommission(x.id)}
                          title="Сбросить override (вернуться к дефолту)"
                        >
                          Сброс
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* ✅ В приложении */}
                  <td
                    className={`p-4 whitespace-nowrap sticky right-[80px] border-l border-gray-300 ${rowBg} z-10`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <InAppToggle
                      value={x.isInApp}
                      disabled={togglingId === x.id}
                      onToggle={(next) => handleToggleInApp(x.id, next)}
                    />
                  </td>

                  {/* ✅ Удалить */}
                  <td
                    className={`p-4 text-right sticky right-0 border-l border-gray-300 ${rowBg} z-20`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <button
                      type="button"
                      title="Удалить ресторан"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
                      disabled={deletingId === x.id}
                      onClick={() => handleDelete(x.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {!loading && items.length === 0 && (
              <tr>
                <td className="p-8 text-gray-600 font-semibold" colSpan={10}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* подсказка, чтобы не ловить “API connection failed” молча */}
      <div className="text-[12px] font-semibold text-gray-500">
        Важно: сохранение дефолтной комиссии использует endpoint{' '}
        <span className="font-mono font-black">PATCH /restaurants/commission/default</span>. Если
        у тебя другой маршрут — скажи какой, я подстрою.
      </div>
    </div>
  );
}