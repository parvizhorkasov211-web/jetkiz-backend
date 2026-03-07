"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewCourierPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const api_1 = require("@/lib/api");
function onlyDigits(s) {
    return (s || "").replace(/\D+/g, "");
}
function normalizePhoneToPlus(digits) {
    const d = onlyDigits(digits);
    if (!d)
        return "";
    if (d.startsWith("7"))
        return `+${d}`;
    if (d.startsWith("8") && d.length === 11)
        return `+7${d.slice(1)}`;
    return `+${d}`;
}
function NewCourierPage() {
    const router = (0, navigation_1.useRouter)();
    const [phone, setPhone] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [firstName, setFirstName] = (0, react_1.useState)("");
    const [lastName, setLastName] = (0, react_1.useState)("");
    const [iin, setIin] = (0, react_1.useState)("");
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [err, setErr] = (0, react_1.useState)(null);
    const clean = (0, react_1.useMemo)(() => {
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
            const created = await (0, api_1.apiFetch)(`/couriers`, {
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
        }
        catch (e) {
            const msg = e?.message ||
                e?.response?.data?.message ||
                e?.response?.message ||
                "Ошибка создания курьера";
            setErr(Array.isArray(msg) ? msg.join(", ") : String(msg));
        }
        finally {
            setSaving(false);
        }
    }
    return (<div className="container-fluid">
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

      {err ? (<div className="alert alert-danger py-2" role="alert">
          {err}
        </div>) : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title m-0">Данные курьера</div>
        </div>

        <div className="card-body">
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Телефон</label>
              <input className="form-control" placeholder="+7 776 158 82 27" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving}/>
              <div className="form-text">
                Будет сохранено как: <b>{clean.phone || "—"}</b>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Пароль</label>
              <input className="form-control" type="password" placeholder="Минимум 4 символа" value={password} onChange={(e) => setPassword(e.target.value)} disabled={saving}/>
              <div className="form-text">Курьер будет входить в приложение курьера с этим паролем.</div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Имя</label>
              <input className="form-control" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={saving}/>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Фамилия</label>
              <input className="form-control" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={saving}/>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">ИИН</label>
              <input className="form-control" placeholder="12 цифр" value={iin} onChange={(e) => setIin(e.target.value)} disabled={saving}/>
              <div className="form-text">
                Будет сохранено как: <b>{clean.iin || "—"}</b>
              </div>
            </div>

            <div className="col-12">
              <div className="separator my-2"/>
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
    </div>);
}
//# sourceMappingURL=page.js.map