"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { CourierFinancePanel } from "@/components/ui/widgets/CourierFinancePanel";
import {
  CourierOnTimeRateMetric,
  CourierOnTimeRateWidget,
} from "@/components/ui/widgets/CourierOnTimeRateWidget";

type ActiveOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  assignedAt?: string | null;
  phone?: string;
  addressId?: string;
  restaurant?: { id: string; nameRu: string };
};

type Courier = {
  id: string;
  userId: string;
  phone: string;

  isActive: boolean;

  avatarUrl?: string | null;

  firstName: string;
  lastName: string;
  iin: string;

  addressText?: string | null;
  comment?: string | null;

  blockedAt?: string | null;
  blockReason?: string | null;

  isOnline: boolean;
  personalFeeOverride?: number | null;
  payoutBonusAdd?: number | null;

  activeOrders?: ActiveOrder[];
  activeTariff?: any;
};

function str(v: any) {
  return v == null ? "" : String(v);
}

function fmtDate(d: any) {
  try {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString();
  } catch {
    return String(d ?? "");
  }
}

function resolveAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) return "";
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

  // ✅ Безопасно: если NEXT_PUBLIC_API_URL не задан — оставляем относительный путь
  const base = (process.env.NEXT_PUBLIC_API_URL || "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) return avatarUrl;

  return `${base}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
}

type CompletedRange = "lifetime" | "day" | "month" | "year" | "custom";

export default function CourierDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const courierId = (params as any)?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [courier, setCourier] = useState<Courier | null>(null);

  // on-time metric
  const [otdLoading, setOtdLoading] = useState(false);
  const [otd, setOtd] = useState<CourierOnTimeRateMetric | null>(null);

  // ✅ completed orders metric + filters
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [completedRange, setCompletedRange] = useState<CompletedRange>("month");
  const [completedFrom, setCompletedFrom] = useState<string>("");
  const [completedTo, setCompletedTo] = useState<string>("");

  // profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [iin, setIin] = useState("");
  const [addressText, setAddressText] = useState("");
  const [comment, setComment] = useState("");
  const [personalFeeOverride, setPersonalFeeOverride] = useState<string>("");
  const [payoutBonusAdd, setPayoutBonusAdd] = useState<string>("");

  // avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  // image viewer modal
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  // block reason
  const [blockReason, setBlockReason] = useState("");

  // orders
  const [orderIdToAssign, setOrderIdToAssign] = useState("");

  const buildCompletedQuery = (courierUserId: string) => {
    const id = (courierUserId || "").trim();
    const p: string[] = [`courierUserId=${encodeURIComponent(id)}`];

    if (completedRange === "day") p.push(`range=day`);
    else if (completedRange === "month") p.push(`range=month`);
    else if (completedRange === "year") p.push(`range=year`);
    else if (completedRange === "custom") {
      const f = completedFrom.trim();
      const t = completedTo.trim();
      if (f) p.push(`from=${encodeURIComponent(f)}`);
      if (t) p.push(`to=${encodeURIComponent(t)}`);
      // backend требует from если указан to — это ок
    } else {
      // lifetime — ничего
    }

    return `/couriers/metrics/completed-count?${p.join("&")}`;
  };

  const loadCompleted = async (courierUserId?: string) => {
    const id = (courierUserId || courierId || "").trim();
    if (!id) return;

    try {
      setCompletedLoading(true);

      const url = buildCompletedQuery(id);
      const json = await apiFetch(url);

      setCompletedCount(typeof json?.totalCompleted === "number" ? json.totalCompleted : 0);
    } catch {
      // метрика не должна ломать страницу
      setCompletedCount(null);
    } finally {
      setCompletedLoading(false);
    }
  };

  const loadOtd = async (courierUserId?: string) => {
    const id = (courierUserId || courierId || "").trim();
    if (!id) return;

    try {
      setOtdLoading(true);

      // ✅ новый backend endpoint
      // по умолчанию считает за 30 дней, SLA = 45 минут
      const json = await apiFetch(
        `/couriers/metrics/on-time-rate?courierUserId=${encodeURIComponent(
          id
        )}&slaMin=45`
      );

      setOtd(json);
    } catch {
      // метрика не должна ломать страницу
      setOtd(null);
    } finally {
      setOtdLoading(false);
    }
  };

  const load = async () => {
    if (!courierId) return;
    try {
      setLoading(true);
      setError(null);

      const [courierJson] = await Promise.all([
        apiFetch(`/couriers/${courierId}`),
      ]);

      setCourier(courierJson);

      setFirstName(str(courierJson.firstName));
      setLastName(str(courierJson.lastName));
      setIin(str(courierJson.iin));
      setAddressText(str(courierJson.addressText ?? ""));
      setComment(str(courierJson.comment ?? ""));
      setPersonalFeeOverride(
        courierJson.personalFeeOverride == null
          ? ""
          : String(courierJson.personalFeeOverride)
      );
      setPayoutBonusAdd(
        courierJson.payoutBonusAdd == null
          ? ""
          : String(courierJson.payoutBonusAdd)
      );
      setBlockReason(str(courierJson.blockReason ?? ""));

      // если пользователь не выбирал файл вручную — сбросим превью на текущее фото
      if (!avatarFile) {
        setAvatarPreview(resolveAvatarSrc(courierJson.avatarUrl ?? null));
      }

      // параллельно метрики
      loadOtd(courierJson.userId || courierId);
      loadCompleted(courierJson.userId || courierId);
    } catch (e: any) {
      setError(e?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierId]);

  // ✅ перезагрузка completed при смене фильтра
  useEffect(() => {
    if (!courier) return;
    loadCompleted(courier.userId || courierId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedRange, completedFrom, completedTo]);

  // очистка objectURL превью, если создавали
  useEffect(() => {
    return () => {
      try {
        if (avatarPreview && avatarPreview.startsWith("blob:")) {
          URL.revokeObjectURL(avatarPreview);
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // закрытие просмотрщика по ESC
  useEffect(() => {
    if (!showAvatarViewer) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAvatarViewer(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAvatarViewer]);

  const onPickAvatar = (file?: File | null) => {
    setError(null);
    setInfo(null);

    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(resolveAvatarSrc(courier?.avatarUrl ?? null));
      return;
    }

    const okType =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp";
    if (!okType) {
      setError("Только jpeg/png/webp");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Файл слишком большой (макс 5MB)");
      return;
    }

    setAvatarFile(file);

    try {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    } catch {}
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const uploadAvatar = async () => {
    if (!courierId) return;
    if (!avatarFile) {
      setError("Выбери файл");
      return;
    }

    try {
      setAvatarUploading(true);
      setError(null);
      setInfo(null);

      const fd = new FormData();
      fd.append("file", avatarFile);

      await apiFetch(`/couriers/${courierId}/avatar`, {
        method: "POST",
        body: fd,
      });

      setInfo("Фото загружено");
      setAvatarFile(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка загрузки фото");
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!courierId) return;
    try {
      setSaving(true);
      setError(null);
      setInfo(null);

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        iin: iin.trim(),
        addressText: addressText.trim() || null,
        comment: comment.trim() || null,
        personalFeeOverride:
          personalFeeOverride.trim() === ""
            ? null
            : Number(personalFeeOverride),
        payoutBonusAdd:
          payoutBonusAdd.trim() === "" ? null : Number(payoutBonusAdd),
      };

      await apiFetch(`/couriers/${courierId}/profile`, {
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

  const toggleBlock = async (nextBlocked: boolean) => {
    if (!courierId) return;
    try {
      setActionLoading(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/blocked`, {
        method: "PATCH",
        body: JSON.stringify({
          blocked: nextBlocked,
          reason: nextBlocked ? blockReason?.trim() || null : null,
        }),
      });

      setInfo(nextBlocked ? "Курьер заблокирован" : "Курьер разблокирован");
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleOnline = async (nextOnline: boolean) => {
    if (!courierId) return;
    try {
      setActionLoading(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/online`, {
        method: "PATCH",
        body: JSON.stringify({ isOnline: nextOnline, source: "admin" }),
      });

      setInfo(nextOnline ? "Онлайн включен" : "Онлайн выключен");
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const assignOrder = async () => {
    if (!courierId) return;
    try {
      setActionLoading(true);
      setError(null);
      setInfo(null);

      const orderId = orderIdToAssign.trim();
      if (!orderId) {
        setError("Укажи orderId");
        return;
      }

      await apiFetch(`/couriers/${courierId}/assign-order`, {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });

      setInfo("Заказ назначен");
      setOrderIdToAssign("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const unassignOrder = async (orderId: string) => {
    if (!courierId) return;
    try {
      setActionLoading(true);
      setError(null);
      setInfo(null);

      await apiFetch(`/couriers/${courierId}/unassign-order`, {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });

      setInfo("Заказ снят");
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const title = useMemo(() => {
    if (!courier) return "Курьер";
    return `${courier.firstName} ${courier.lastName}`.trim() || courier.phone;
  }, [courier]);

  if (loading) {
    return (
      <div className="p-6 courier-details-page">
        <div className="text-sm text-gray-600">Загрузка…</div>
      </div>
    );
  }

  if (!courier) {
    return (
      <div className="p-6 courier-details-page">
        <div className="mb-3 font-semibold">Курьер не найден</div>
        <button
          className="px-4 py-2 rounded border"
          onClick={() => router.back()}
        >
          Назад
        </button>
      </div>
    );
  }

  const blocked = !courier.isActive;

  const avatarSrc = avatarPreview || resolveAvatarSrc(courier.avatarUrl ?? null);
  const canOpenViewer = !!avatarSrc;

  return (
    <div className="p-6 courier-details-page">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={`h-12 w-12 rounded-full overflow-hidden border bg-gray-50 flex items-center justify-center ${
              canOpenViewer ? "cursor-pointer" : "cursor-default"
            }`}
            onClick={() => {
              if (canOpenViewer) setShowAvatarViewer(true);
            }}
            title={canOpenViewer ? "Открыть фото" : ""}
            aria-label="Open avatar"
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-xs text-gray-400">No фото</div>
            )}
          </button>

          <div>
            <div className="text-xl font-semibold">{title}</div>
            <div className="text-sm text-gray-600">{courier.phone}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded border"
            onClick={() => router.push("/layout-20/couriers")}
          >
            Назад
          </button>

          <button
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-gray-300 bg-gray-100 p-3 text-sm text-gray-900">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded border border-gray-300 bg-gray-100 p-3 text-sm text-gray-900">
          {info}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 rounded border border-gray-300 bg-gray-100 p-4">
          <div className="text-lg font-extrabold mb-3">Профиль</div>

          <div className="mb-5 rounded border border-gray-300 bg-gray-100 p-4">
            <div className="text-base font-extrabold mb-3">
              Фото курьера (аватар)
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <button
                type="button"
                className={`avatar-big ${canOpenViewer ? "clickable" : ""}`}
                onClick={() => {
                  if (canOpenViewer) setShowAvatarViewer(true);
                }}
                title={canOpenViewer ? "Открыть фото" : ""}
                aria-label="Open avatar big"
              >
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-gray-400">No фото</div>
                )}
              </button>

              <div className="flex flex-col gap-3 w-full">
                <div className="file-row">
                  <input
                    className="file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      onPickAvatar(e.target.files?.[0] ?? null)
                    }
                  />
                  <div className="text-xs text-gray-700 mt-1">
                    Форматы: jpeg/png/webp, до 5MB
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
                    onClick={uploadAvatar}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? "Загрузка…" : "Загрузить фото"}
                  </button>

                  <button
                    className="px-4 py-2 rounded border disabled:opacity-60"
                    onClick={() => onPickAvatar(null)}
                    disabled={avatarUploading}
                    type="button"
                  >
                    Сбросить выбор
                  </button>

                  {canOpenViewer ? (
                    <button
                      className="px-4 py-2 rounded border"
                      onClick={() => setShowAvatarViewer(true)}
                      type="button"
                    >
                      Открыть
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-extrabold text-gray-900">Имя</div>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div>
              <div className="text-sm font-extrabold text-gray-900">
                Фамилия
              </div>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div>
              <div className="text-sm font-extrabold text-gray-900">ИИН</div>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={iin}
                onChange={(e) => setIin(e.target.value)}
              />
            </div>

            <div>
              <div className="text-sm font-extrabold text-gray-900">Адрес</div>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-extrabold text-gray-900">
                Комментарий
              </div>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-extrabold text-gray-900">
                Персональный тариф (legacy override, работает только когда
                погода выключена)
              </div>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={personalFeeOverride}
                onChange={(e) => setPersonalFeeOverride(e.target.value)}
                placeholder="Напр. 1100"
              />

              <div className="mt-3 text-sm font-extrabold text-gray-900">
                Бонус к выплате курьеру (надбавка, тг)
              </div>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={payoutBonusAdd}
                onChange={(e) => setPayoutBonusAdd(e.target.value)}
                placeholder="Напр. 200"
              />
            </div>
          </div>
        </div>

        {/* правая колонка: completed + OTD + финансы */}
        <div className="flex flex-col gap-4">
          <div className="rounded border border-gray-300 bg-gray-100 p-4">
            <div className="text-sm font-extrabold mb-2">Выполнено заказов</div>

            <div className="flex flex-col gap-2 mb-3">
              <select
                className="w-full border rounded px-3 py-2"
                value={completedRange}
                onChange={(e) => setCompletedRange(e.target.value as CompletedRange)}
              >
                <option value="day">За день (сегодня)</option>
                <option value="month">За месяц (с начала месяца)</option>
                <option value="year">За год (с начала года)</option>
                <option value="custom">Произвольно (from/to)</option>
                <option value="lifetime">За всё время</option>
              </select>

              {completedRange === "custom" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-gray-900">From</div>
                    <input
                      type="date"
                      className="mt-1 w-full border rounded px-3 py-2"
                      value={completedFrom}
                      onChange={(e) => setCompletedFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-gray-900">To</div>
                    <input
                      type="date"
                      className="mt-1 w-full border rounded px-3 py-2"
                      value={completedTo}
                      onChange={(e) => setCompletedTo(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {completedLoading ? (
              <div className="text-sm text-gray-600">Загрузка…</div>
            ) : (
              <div className="text-2xl font-black">{completedCount ?? "—"}</div>
            )}
          </div>

          <div className="rounded border border-gray-300 bg-gray-100 p-4">
            <CourierOnTimeRateWidget metric={otd} loading={otdLoading} />
          </div>

          <div className="rounded border border-gray-300 bg-gray-100 p-4">
            <CourierFinancePanel courierId={courierId} />
          </div>
        </div>

        <div className="rounded border border-gray-300 bg-gray-100 p-4">
          <div className="text-lg font-extrabold mb-3">Статус</div>

          <div className="text-sm text-gray-900">
            <div className="flex items-center justify-between">
              <span className="font-extrabold">Активен</span>
              <span className="text-gray-900">{blocked ? "Нет" : "Да"}</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="font-extrabold">Онлайн</span>
              <span className="text-gray-900">{courier.isOnline ? "Да" : "Нет"}</span>
            </div>

            <div className="mt-3 text-xs text-gray-700">
              Последняя активность:{" "}
              {fmtDate(
                courier?.activeTariff?.lastActiveAt ??
                  (courier as any)?.lastActiveAt
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              className="px-4 py-2 rounded border disabled:opacity-60"
              onClick={() => toggleOnline(!courier.isOnline)}
              disabled={actionLoading || blocked}
            >
              {courier.isOnline ? "Сделать оффлайн" : "Сделать онлайн"}
            </button>

            <button
              className="px-4 py-2 rounded border disabled:opacity-60"
              onClick={() => toggleBlock(!blocked)}
              disabled={actionLoading}
            >
              {blocked ? "Разблокировать" : "Заблокировать"}
            </button>

            {!blocked && (
              <div className="mt-2">
                <div className="text-xs font-extrabold text-gray-900">
                  Причина блокировки (если блокируешь)
                </div>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded border border-gray-300 bg-gray-100 p-4">
        <div className="text-lg font-extrabold mb-3">Активные заказы</div>

        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            className="w-full md:w-80 border rounded px-3 py-2"
            value={orderIdToAssign}
            onChange={(e) => setOrderIdToAssign(e.target.value)}
            placeholder="orderId"
          />
          <button
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
            onClick={assignOrder}
            disabled={actionLoading}
          >
            Назначить
          </button>
        </div>

        {!courier.activeOrders?.length ? (
          <div className="text-sm text-gray-900">Нет активных заказов</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4 font-extrabold">ID</th>
                  <th className="py-2 pr-4 font-extrabold">Статус</th>
                  <th className="py-2 pr-4 font-extrabold">Сумма</th>
                  <th className="py-2 pr-4 font-extrabold">Создан</th>
                  <th className="py-2 pr-4 font-extrabold">Назначен</th>
                  <th className="py-2 pr-4 font-extrabold">Ресторан</th>
                  <th className="py-2 pr-4 font-extrabold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {courier.activeOrders.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="py-2 pr-4">{o.id}</td>
                    <td className="py-2 pr-4">{o.status}</td>
                    <td className="py-2 pr-4">{o.total}</td>
                    <td className="py-2 pr-4">{fmtDate(o.createdAt)}</td>
                    <td className="py-2 pr-4">{fmtDate(o.assignedAt)}</td>
                    <td className="py-2 pr-4">{o.restaurant?.nameRu ?? ""}</td>
                    <td className="py-2 pr-4">
                      <button
                        className="px-3 py-1 rounded border"
                        onClick={() => unassignOrder(o.id)}
                        disabled={actionLoading}
                      >
                        Снять
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAvatarViewer ? (
        <div
          className="img-viewer-backdrop"
          onClick={() => setShowAvatarViewer(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="img-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="img-viewer-header">
              <div className="img-viewer-title">Фото курьера</div>
              <button
                className="img-viewer-close"
                onClick={() => setShowAvatarViewer(false)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="img-viewer-body">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="avatar-full"
                  className="img-viewer-img"
                />
              ) : (
                <div className="text-sm text-gray-600">Нет фото</div>
              )}
            </div>

            <div className="img-viewer-footer">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setShowAvatarViewer(false)}
                type="button"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        /* ✅ ВСЕ ПОЛЯ ОДНИМ СЕРЫМ ЦВЕТОМ */
        .courier-details-page input,
        .courier-details-page textarea,
        .courier-details-page select {
          background: #f2f2f2 !important;
          border: 1px solid #cfcfcf !important;
          color: #111 !important;
        }
        .courier-details-page input::placeholder,
        .courier-details-page textarea::placeholder {
          color: rgba(17, 17, 17, 0.45) !important;
        }
        .courier-details-page input:focus,
        .courier-details-page textarea:focus,
        .courier-details-page select:focus {
          outline: none !important;
          border-color: #9a9a9a !important;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08) !important;
          background: #f2f2f2 !important;
        }

        .avatar-big {
          width: 140px;
          height: 140px;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.2);
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }
        .avatar-big.clickable {
          cursor: pointer;
        }
        .avatar-big.clickable:hover {
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
        }

        .file-row .file-input {
          display: block;
          width: 100%;
          max-width: 520px;
        }

        .img-viewer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 16px;
        }

        .img-viewer {
          width: min(1100px, calc(100vw - 24px));
          height: min(820px, calc(100vh - 24px));
          background: #fff;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .img-viewer-header {
          padding: 12px 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .img-viewer-title {
          font-weight: 900;
          color: #111;
        }

        .img-viewer-close {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #fff;
          font-weight: 900;
        }
        .img-viewer-close:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        .img-viewer-body {
          flex: 1 1 auto;
          min-height: 0;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0b0b0b;
        }

        .img-viewer-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          background: #0b0b0b;
        }

        .img-viewer-footer {
          padding: 12px 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: #fff;
        }
      `}</style>
    </div>
  );
}