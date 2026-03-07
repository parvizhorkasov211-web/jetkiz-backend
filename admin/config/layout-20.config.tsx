import { MenuConfig } from "@/config/types";
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Bike,
  TicketPercent,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  LifeBuoy,
  FileText
} from "lucide-react";

/**
 * Jetkiz Admin (Layout 20)
 * Базовый префикс для страниц этого layout:
 * /layout-20/...
 */
const L20 = "/layout-20";

export const MENU_SIDEBAR_MAIN: MenuConfig = [
  {
    children: [
      {
        title: "Дашборд",
        path: `${L20}`,
        icon: LayoutDashboard
      },
      {
        title: "Заказы",
        path: `${L20}/orders`,
        icon: ShoppingBag
      },
      {
        title: "Рестораны",
        path: `${L20}/restaurants`,
        icon: Store
      },
     {
  title: "Курьеры",
  path: "/layout-20/couriers",
},
{
  title: "Карта курьеров",
  path: "/layout-20/couriers/map",
},
      {
        title: "Промокоды",
        path: `${L20}/promocodes`,
        icon: TicketPercent
      },
      {
        title: "Пользователи",
        path: `${L20}/users`,
        icon: Users
      },
      {
        title: "Аналитика",
        path: `${L20}/analytics`,
        icon: BarChart3
      }
    ]
  }
];

export const MENU_SIDEBAR_WORKSPACES: MenuConfig = [
  {
    title: "Управление",
    children: [
      {
        title: "Роли и доступы",
        path: `${L20}/access`,
        icon: ShieldCheck
      },
      {
        title: "Настройки",
        path: `${L20}/settings`,
        icon: Settings
      }
    ]
  }
];

export const MENU_SIDEBAR_RESOURCES: MenuConfig = [
  {
    title: "Справка",
    children: [
      {
        title: "Документация",
        path: `${L20}/docs`,
        icon: FileText
      },
      {
        title: "Поддержка",
        path: `${L20}/support`,
        icon: LifeBuoy
      }
    ]
  }
];

/**
 * Toolbar можно пока упростить/очистить.
 * Если toolbar не нужен — можно оставить пустым массивом.
 */
export const MENU_TOOLBAR: MenuConfig = [
  {
    title: "Дашборд",
    path: `${L20}`,
    icon: LayoutDashboard
  },
  {
    title: "Заказы",
    path: `${L20}/orders`,
    icon: ShoppingBag
  }
];
