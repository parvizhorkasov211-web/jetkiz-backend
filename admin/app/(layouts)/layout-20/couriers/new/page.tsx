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
  // если ввели 776..., делаем +7...
  if (d.startsWith("7")) return `+${d}`;
  // если ввели 8..., можно тоже привести к +7..., но пока просто +<digits>
  if (d.startsWith("8") && d.length === 11) return `+7${d.slice(1)}`;
  return `+${d}`;
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
    if (!clean.phone || clean.phone.length < 12) return "Телефон: укажи корректный номер (пример: +7XXXXXXXXXX)";
    if (!password || password.length < 4) return "Пароль: минимум 4 символа";
    if (!firstName.trim()) return "Имя обязательно";
    if (!lastName.trim()) return "Фамилия обязательна";
    if (!clean.iin || clean.iin.length !== 12) return "ИИН должен быть 12 цифр";
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

      // ✅ гарантируем попадание в список:
      // 1) уходим на список
      // 2) добавляем query, чтобы точно был новый рендер и загрузка
      router.push("/layout-20/couriers?created=1");
      router.refresh();

      return created;
    } catch (e: any) {
      // стараемся показать максимально понятную ошибку
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
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="mb-1">Добавить курьера</h2>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Создаётся аккаунт COURIER и профиль курьера. После сохранения курьер появится в списке.
          </div>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-light" onClick={() => router.push("/layout-20/couriers")} disabled={saving}>
            Назад
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Сохранение…" : "Создать"}
          </button>
        </div>
      </div>

      {err ? (
        <div className="alert alert-danger py-2" role="alert">
          {err}
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title m-0">Данные курьера</div>
        </div>

        <div className="card-body">
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Телефон</label>
              <input
                className="form-control"
                placeholder="+7 776 158 82 27"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
              />
              <div className="form-text">
                Будет сохранено как: <b>{clean.phone || "—"}</b>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Пароль</label>
              <input
                className="form-control"
                type="password"
                placeholder="Минимум 4 символа"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
              />
              <div className="form-text">Курьер будет входить в приложение курьера с этим паролем.</div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Имя</label>
              <input
                className="form-control"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Фамилия</label>
              <input
                className="form-control"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">ИИН</label>
              <input
                className="form-control"
                placeholder="12 цифр"
                value={iin}
                onChange={(e) => setIin(e.target.value)}
                disabled={saving}
              />
              <div className="form-text">
                Будет сохранено как: <b>{clean.iin || "—"}</b>
              </div>
            </div>

            <div className="col-12">
              <div className="separator my-2" />
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="text-muted" style={{ fontSize: 13 }}>
                  Совет: телефон и ИИН должны быть уникальными (если уже есть — backend вернёт ошибку).
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-light" onClick={() => router.push("/layout-20/couriers")} disabled={saving}>
                    Отмена
                  </button>
                  <button className="btn btn-primary" onClick={submit} disabled={saving}>
                    {saving ? "Сохранение…" : "Создать курьера"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}