"use client";

import { usePathname, useRouter } from "next/navigation";

const LABELS: Record<string, string> = {
  // системное
  "layout-20": "Админка",

  // разделы
  couriers: "Курьеры",
  orders: "Заказы",
  restaurants: "Рестораны",
  users: "Пользователи",
  finance: "Финансы",
  promocodes: "Промокоды",
  analytics: "Аналитика",
  settings: "Настройки",
  roles: "Роли и доступы",

  // прочее
  account: "Аккаунт",
  updates: "Обновления",
  new: "Создать",
  edit: "Редактировать",
};

function label(seg: string) {
  return LABELS[seg] ?? seg.replace(/-/g, " ");
}

/**
 * Именованный экспорт (если где-то импортируют так: import { HeaderTitle } from './header-title')
 */
export function HeaderTitle() {
  const router = useRouter();
  const pathname = usePathname();

  const rawSegments = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);

  // убираем layout-20 из крошек, но оставляем как базовый префикс для href
  const segments = rawSegments.filter((s) => s !== "layout-20");

  // базовый путь админки
  const base = "/layout-20";

  const crumbs = [
    { href: base, text: "Главная" },
    ...segments.map((seg, i) => ({
      href: base + "/" + segments.slice(0, i + 1).join("/"),
      text: label(seg),
    })),
  ];

  const current = crumbs[crumbs.length - 1]?.text ?? "";

  return (
    <div className="d-flex flex-column">
      {/* Заголовок страницы (крупно и жирно) */}
      <div className="fw-bold fs-2 text-gray-900">{current}</div>

      {/* Breadcrumbs: строго в одну строку */}
      <ul
        className="breadcrumb breadcrumb-separatorless fw-semibold fs-6 my-0"
        style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 0 }}
      >
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;

          return (
            <li
              key={c.href}
              className="breadcrumb-item d-flex align-items-center"
              style={{ whiteSpace: "nowrap" }}
            >
              {!isLast ? (
                <a
                  onClick={() => router.push(c.href)}
                  className="text-primary fw-bold text-hover-primary"
                  style={{
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: 10,
                    background: "rgba(27,132,255,0.10)",
                  }}
                >
                  {c.text}
                </a>
              ) : (
                <span
                  className="fw-bold text-gray-900"
                  style={{
                    padding: "4px 10px",
                    borderRadius: 10,
                    background: "rgba(7,20,55,0.08)",
                  }}
                >
                  {c.text}
                </span>
              )}

              {!isLast && (
                <span className="mx-2 fw-bold" style={{ opacity: 0.6 }}>
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Default export (если где-то импортируют так: import HeaderTitle from './header-title')
 */
export default HeaderTitle;