"use client";

import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayout } from "./context";
import { usePathname, useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { apiFetch } from "@/lib/api";

export function HeaderToolbar() {
  const { isMobile } = useLayout();
  const router = useRouter();
  const pathname = usePathname();

  const isCouriersPage = pathname === "/layout-20/couriers";
  const isCouriersNewPage = pathname === "/layout-20/couriers/new";

  const isRestaurantsPage = pathname === "/layout-20/restaurants";
  const isRestaurantsNewPage = pathname === "/layout-20/restaurants/new";

  const handleAddClick = () => {
    if (isCouriersPage) {
      router.push("/layout-20/couriers/new");
      return;
    }

    if (isRestaurantsPage) {
      router.push("/layout-20/restaurants/new");
      return;
    }
  };

  const handleReportsClick = async () => {
    try {
      if (isCouriersPage) {
        const data = await apiFetch("/couriers");
        const couriers = Array.isArray(data)
          ? data
          : data?.items ?? data?.data ?? [];

        const rows = couriers.map((c: any) => ({
          ID: c.id,
          "Имя/Фамилия":
            c.name ??
            `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
          Телефон: c.phone ?? c.user?.phone ?? "",
          ИНН: c.iin ?? "",
          Статус: c.status ?? "",
          "Комиссия override (%)":
            c.courierCommissionPctOverride ??
            c.courierProfile?.courierCommissionPctOverride ??
            "",
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Couriers");
        XLSX.writeFile(wb, "couriers.xlsx");
        return;
      }

      if (isRestaurantsPage) {
        const data = await apiFetch("/restaurants");
        const restaurants = Array.isArray(data)
          ? data
          : data?.items ?? data?.data ?? [];

        const rows = restaurants.map((r: any) => ({
          ID: r.id,
          "Название (RU)": r.nameRu ?? "",
          "Название (KZ)": r.nameKk ?? "",
          Статус: r.status ?? "",
          Адрес: r.address ?? "",
          Телефон: r.phone ?? "",
          Комиссия: r.commissionPct ?? "",
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Restaurants");
        XLSX.writeFile(wb, "restaurants.xlsx");
        return;
      }
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  const showAddButton =
    (isCouriersPage && !isCouriersNewPage) ||
    (isRestaurantsPage && !isRestaurantsNewPage);

  const addButtonLabel = isCouriersPage
    ? "Добавить курьера"
    : isRestaurantsPage
    ? "Добавить ресторан"
    : null;

  const showExportButton = isCouriersPage || isRestaurantsPage;

  return (
    <nav className="flex items-center gap-2.5">
      {showExportButton && (
        <button
          type="button"
          onClick={handleReportsClick}
          className="bg-green-600 hover:bg-green-700 text-white rounded-md px-3 py-2 inline-flex items-center gap-2"
        >
          <ClipboardList size={18} />
          {!isMobile && <span>Выгрузить в Excel</span>}
        </button>
      )}

      {showAddButton && addButtonLabel && (
        <Button variant="mono" onClick={handleAddClick}>
          <Plus />
          {!isMobile && <span>{addButtonLabel}</span>}
        </Button>
      )}
    </nav>
  );
}