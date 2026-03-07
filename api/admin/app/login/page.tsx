"use client";

import { useEffect, useState } from "react";
import { setToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const DISABLE_AUTH = process.env.NEXT_PUBLIC_DISABLE_AUTH === "1";

function setAccessCookie(token: string) {
  document.cookie = `access_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}

export default function LoginPage() {
  const [phone, setPhone] = useState("77000000000");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ DEV: логин без пароля, но с настоящим JWT
  useEffect(() => {
    if (!DISABLE_AUTH) return;

    (async () => {
      try {
        const r = await fetch(`${API_URL}/auth/dev-admin-token`, { method: "POST" });
        const data = await r.json().catch(() => ({}));
        const token = data?.accessToken || data?.access_token || data?.token;

        if (!r.ok || !token) throw new Error(data?.message || "Не смог получить dev токен");

        setToken(token);
        setAccessCookie(token);

        window.location.href = "/layout-20";
      } catch (e: any) {
        setMsg(e?.message || "Ошибка dev входа");
      }
    })();
  }, []);

  async function onLogin() {
    try {
      setLoading(true);
      setMsg(null);

      const r = await fetch(`${API_URL}/auth/login-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Неверный логин или пароль");

      const token = data?.access_token || data?.accessToken || data?.token;
      if (!token) throw new Error("Токен не пришёл с сервера");

      setToken(token);
      setAccessCookie(token);

      window.location.href = "/layout-20";
    } catch (e: any) {
      setMsg(e?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (DISABLE_AUTH) {
    return (
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold">Вход в Jetkiz Admin</h1>
        <div>Открываем админку…</div>
        {msg && <div className="text-red-600 text-sm">{msg}</div>}
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Вход в Jetkiz Admin</h1>

      <input
        className="input w-full"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="7708..."
      />

      <input
        className="input w-full"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
      />

      <button className="btn btn-primary w-full" onClick={onLogin} disabled={loading}>
        {loading ? "Входим..." : "Войти"}
      </button>

      {msg && <div className="text-red-600 text-sm">{msg}</div>}
    </div>
  );
}