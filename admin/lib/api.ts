import { getToken } from "./auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  // 1) сначала пробуем localStorage через auth.ts
  // 2) если пусто — берём из cookie access_token
  const token = getToken?.() || getCookie("access_token");

  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg = (data as any)?.message || (data as any)?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}