"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type FinanceConfig = {
  id: string;
  clientDeliveryFeeDefault: number;
  clientDeliveryFeeWeather: number;
  courierPayoutDefault: number;
  courierPayoutWeather: number;
  weatherEnabled: boolean;
};

function toStr(v: any) {
  return v == null ? "" : String(v);
}

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [weatherEnabled, setWeatherEnabled] = useState(false);

  const [clientDeliveryFeeDefault, setClientDeliveryFeeDefault] = useState("");
  const [clientDeliveryFeeWeather, setClientDeliveryFeeWeather] = useState("");
  const [courierPayoutDefault, setCourierPayoutDefault] = useState("");
  const [courierPayoutWeather, setCourierPayoutWeather] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const json = await apiFetch("/orders/finance/config");
      const cfg: FinanceConfig = (json?.config ?? json) as any;

      setWeatherEnabled(Boolean(cfg.weatherEnabled));
      setClientDeliveryFeeDefault(toStr(cfg.clientDeliveryFeeDefault));
      setClientDeliveryFeeWeather(toStr(cfg.clientDeliveryFeeWeather));
      setCourierPayoutDefault(toStr(cfg.courierPayoutDefault));
      setCourierPayoutWeather(toStr(cfg.courierPayoutWeather));
    } catch (e: any) {
      setError(e?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setInfo(null);

      const payload = {
        weatherEnabled,
        clientDeliveryFeeDefault: Number(clientDeliveryFeeDefault),
        clientDeliveryFeeWeather: Number(clientDeliveryFeeWeather),
        courierPayoutDefault: Number(courierPayoutDefault),
        courierPayoutWeather: Number(courierPayoutWeather),
      };

      await apiFetch("/orders/finance/config", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setInfo("Сохранено");
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-600">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Финансы доставки</h1>
          <div className="text-sm text-gray-600">
            Глобальные тарифы + массовый режим (погода/пик). Курьерские бонусы
            настраиваются в карточке курьера.
          </div>
        </div>
        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {info}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded border p-4">
          <div className="text-base font-semibold mb-3">Глобальные тарифы</div>

          <div className="text-sm text-gray-600">Доставка для клиента (обычно)</div>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={clientDeliveryFeeDefault}
            onChange={(e) => setClientDeliveryFeeDefault(e.target.value)}
            placeholder="Напр. 1200"
          />

          <div className="mt-4 text-sm text-gray-600">Выплата курьеру (обычно)</div>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={courierPayoutDefault}
            onChange={(e) => setCourierPayoutDefault(e.target.value)}
            placeholder="Напр. 1100"
          />

          <div className="mt-4 text-xs text-gray-500">
            Цена доставки для клиента НЕ зависит от курьера. Курьерские бонусы
            добавляются отдельно.
          </div>
        </div>

        <div className="rounded border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-semibold">Массовый режим (погода/пик)</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={weatherEnabled}
                onChange={(e) => setWeatherEnabled(e.target.checked)}
              />
              Включено
            </label>
          </div>

          <div className="text-sm text-gray-600">
            Доставка для клиента (в режиме)
          </div>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={clientDeliveryFeeWeather}
            onChange={(e) => setClientDeliveryFeeWeather(e.target.value)}
            placeholder="Напр. 1500"
          />

          <div className="mt-4 text-sm text-gray-600">Выплата курьеру (в режиме)</div>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={courierPayoutWeather}
            onChange={(e) => setCourierPayoutWeather(e.target.value)}
            placeholder="Напр. 1500"
          />

          <div className="mt-4 text-xs text-gray-500">
            При включении режима он имеет приоритет для всех. Индивидуальные бонусы курьера
            прибавляются поверх базы/режима.
          </div>
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <div className="text-base font-semibold mb-2">Что будет применяться</div>
        <div className="text-sm text-gray-700">
          <div>
            Клиент платит:{" "}
            <b>
              {weatherEnabled ? clientDeliveryFeeWeather : clientDeliveryFeeDefault}
            </b>
          </div>
          <div>
            Курьер получает базу:{" "}
            <b>{weatherEnabled ? courierPayoutWeather : courierPayoutDefault}</b>{" "}
            + бонус (если задан у курьера).
          </div>
        </div>
      </div>
    </div>
  );
}