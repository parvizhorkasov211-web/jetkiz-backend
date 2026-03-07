"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

function onlyDigits(s: string) {
  return (s || "").replace(/\D+/g, "");
}

function normalizePhoneToPlus(digits: string) {
  const d = onlyDigits(digits);
  if (!d) return "";
  if (d.startsWith("7")) return `+${d}`;
  if (d.startsWith("8") && d.length === 11) return `+7${d.slice(1)}`;
  return `+${d}`;
}

/* ---------- UI PANEL ---------- */

function Panel({
  title,
  subtitle,
  right,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">

        <div>

          <div className="text-2xl font-extrabold">
            {title}
          </div>

          {subtitle ? (
            <div className="text-base opacity-70 mt-2">
              {subtitle}
            </div>
          ) : null}

        </div>

        {right}

      </div>

      <div className="p-6">
        {children}
      </div>

    </div>
  );
}

export default function NewCourierPage() {

  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [iin, setIin] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clean = useMemo(() => {
    const p = normalizePhoneToPlus(phone);
    const i = onlyDigits(iin);
    return { phone: p, iin: i };
  }, [phone, iin]);

  function validate() {

    if (!clean.phone || clean.phone.length < 12)
      return "Телефон: укажи корректный номер (пример: +7XXXXXXXXXX)";

    if (!password || password.length < 4)
      return "Пароль: минимум 4 символа";

    if (!firstName.trim())
      return "Имя обязательно";

    if (!lastName.trim())
      return "Фамилия обязательна";

    if (!clean.iin || clean.iin.length !== 12)
      return "ИИН должен быть 12 цифр";

    return null;
  }

  async function submit() {

    setErr(null);

    const v = validate();

    if (v) {
      setErr(v);
      return;
    }

    setSaving(true);

    try {

      const created = await apiFetch(`/couriers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: clean.phone,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          iin: clean.iin,
        }),
      });

      router.push("/layout-20/couriers?created=1");
      router.refresh();

      return created;

    } catch (e: any) {

      const msg =
        e?.message ||
        e?.response?.data?.message ||
        e?.response?.message ||
        "Ошибка создания курьера";

      setErr(Array.isArray(msg) ? msg.join(", ") : String(msg));

    } finally {

      setSaving(false);

    }

  }

  return (

    <div className="space-y-5 rounded-2xl p-4 md:p-5 bg-slate-50">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <button
            className="btn btn-lg btn-light"
            onClick={() => router.push("/layout-20/couriers")}
            style={{ borderRadius: 14 }}
          >
            ← Назад
          </button>

          <div>

            <div className="text-3xl font-extrabold">
              Новый курьер
            </div>

            <div className="text-lg opacity-70">
              Создание аккаунта курьера
            </div>

          </div>

        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={submit}
          disabled={saving}
          style={{ borderRadius: 14 }}
        >
          {saving ? "Создание..." : "Создать"}
        </button>

      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-lg">
          {err}
        </div>
      )}

      {/* FORM */}

      <Panel
        title="Основная информация"
        subtitle="Данные профиля курьера"
      >

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* PHONE */}

          <div>

            <div className="text-base font-semibold mb-2">
              Телефон
            </div>

            <input
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="+7 777 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
            />

            <div className="text-sm opacity-70 mt-2">
              Будет сохранено как: <b>{clean.phone || "—"}</b>
            </div>

          </div>

          {/* PASSWORD */}

          <div>

            <div className="text-base font-semibold mb-2">
              Пароль
            </div>

            <input
              type="password"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Минимум 4 символа"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
            />

            <div className="text-sm opacity-70 mt-2">
              Курьер будет входить в приложение с этим паролем
            </div>

          </div>

          {/* FIRST NAME */}

          <div>

            <div className="text-base font-semibold mb-2">
              Имя
            </div>

            <input
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={saving}
            />

          </div>

          {/* LAST NAME */}

          <div>

            <div className="text-base font-semibold mb-2">
              Фамилия
            </div>

            <input
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={saving}
            />

          </div>

          {/* IIN */}

          <div>

            <div className="text-base font-semibold mb-2">
              ИИН
            </div>

            <input
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="12 цифр"
              value={iin}
              onChange={(e) => setIin(e.target.value)}
              disabled={saving}
            />

            <div className="text-sm opacity-70 mt-2">
              Будет сохранено как: <b>{clean.iin || "—"}</b>
            </div>

          </div>

        </div>

      </Panel>

      {/* FOOTER ACTIONS */}

      <div className="flex justify-end gap-3">

        <button
          className="btn btn-lg btn-light"
          onClick={() => router.push("/layout-20/couriers")}
          disabled={saving}
          style={{ borderRadius: 14 }}
        >
          Отмена
        </button>

        <button
          className="btn btn-primary btn-lg"
          onClick={submit}
          disabled={saving}
          style={{ borderRadius: 14 }}
        >
          {saving ? "Создание..." : "Создать курьера"}
        </button>

      </div>

    </div>

  );

}