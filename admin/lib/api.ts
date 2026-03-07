// admin/lib/api.ts
import { getToken } from "./auth";

function normalizeBaseUrl(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

// Если в Nest есть app.setGlobalPrefix('api'),
// то в .env.local поставь NEXT_PUBLIC_API_URL=http://localhost:3001/api
export const API_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
);

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function isFormData(body: any): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken?.() || getCookie("access_token");

  const headers = new Headers(init.headers || {});

  // ВАЖНО: для FormData НЕ ставим Content-Type (boundary выставит браузер)
  if (init.body && !headers.has("Content-Type") && !isFormData(init.body)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const base = API_URL;
  const finalPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${finalPath}`;

  let res: Response;

  try {
    res = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch (e: any) {
    // Чёткое логирование СЕТЕВЫХ ошибок (сервер недоступен, CORS, DNS и т.д.)
    console.error("API network error:", url, e?.message);
    throw new Error("API connection failed");
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  // HTTP ошибки НЕ затираем
  if (!res.ok) {
    const msg =
      (data as any)?.message ||
      (data as any)?.error ||
      (data as any)?.raw ||
      `HTTP ${res.status}`;

    // message у Nest часто бывает массивом строк
    if (Array.isArray(msg)) {
      throw new Error(msg.join("; "));
    }

    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return data;
}