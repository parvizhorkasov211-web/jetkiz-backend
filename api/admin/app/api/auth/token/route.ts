import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Возвращает access token из HttpOnly cookie (server-side).
 * Клиентский код не может читать HttpOnly cookie через document.cookie,
 * поэтому делаем прокси-эндпоинт.
 */
export async function GET() {
  const jar = cookies();

  // Поддержка разных названий на всякий случай
  const token =
    jar.get("access_token")?.value ||
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    "";

  return NextResponse.json({ token });
}