"use client";

import Link from "next/link";
import Image from "next/image";

export function SidebarHeader() {
  return (
    <div
      id="kt_app_sidebar_logo"
      style={{
        width: "100%",
        padding: "18px 0", // 0 по бокам => от края до края
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Link
        href="/layout-20"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center", // центрируем по ширине сайдбара
          gap: 14,
          textDecoration: "none",
          padding: "0 16px", // аккуратный внутренний отступ (если хочешь прям в ноль — поставь 0)
        }}
      >
        {/* большой логотип */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            overflow: "hidden",
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <Image
            src="/media/brand-logos/jetkiz.png"
            alt="JETKIZ"
            width={64}
            height={64}
            priority
          />
        </div>

        {/* крупный текст */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#fff",
              fontWeight: 900,
              fontSize: 18,
              lineHeight: "20px",
              letterSpacing: "0.4px",
            }}
          >
            JETKIZ
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.7)",
              fontWeight: 700,
              fontSize: 12,
              lineHeight: "14px",
            }}
          >
            Admin Panel
          </span>
        </div>
      </Link>
    </div>
  );
}

export default SidebarHeader;