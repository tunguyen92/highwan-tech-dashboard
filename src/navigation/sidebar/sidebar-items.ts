import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Boxes,
  Building,
  Calendar,
  ChartBar,
  CheckSquare,
  FileSpreadsheet,
  Fingerprint,
  FolderOpen,
  Forklift,
  Gauge,
  GraduationCap,
  HeartPulse,
  Kanban,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  Package,
  ReceiptText,
  Scale,
  Server,
  ShoppingBag,
  SquareArrowUpRight,
  UserRound,
  Users,
} from "lucide-react";

import type { TFunction } from "@/lib/i18n/translate";
import type { Role } from "@/lib/wms/constants";
import { can, type Permission } from "@/lib/wms/permissions";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  permission?: Permission; // if not specified, all roles can access
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  permission?: Permission;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Warehouse",
    items: [
      {
        id: "overview",
        title: "Overview",
        url: "/dashboard/overview",
        icon: LayoutGrid,
        permission: "overview:read",
      },
      { id: "stock", title: "Inventory", url: "/dashboard/stock", icon: Boxes },
      {
        id: "imports",
        title: "Receipts",
        url: "/dashboard/vouchers/import",
        icon: ArrowDownToLine,
        permission: "voucher:read",
      },
      {
        id: "exports",
        title: "Issues",
        url: "/dashboard/vouchers/export",
        icon: ArrowUpFromLine,
        permission: "voucher:read",
      },
    ],
  },
  {
    id: 2,
    label: "Catalog",
    items: [
      { id: "items", title: "Items", url: "/dashboard/items", icon: Package, permission: "item:read" },
      { id: "boms", title: "BOM (bill of materials)", url: "/dashboard/boms", icon: Layers, permission: "bom:read" },
    ],
  },
  {
    id: 3,
    label: "Reports",
    items: [
      {
        id: "movement",
        title: "In - Out - Balance",
        url: "/dashboard/reports/movement",
        icon: FileSpreadsheet,
        permission: "report:read",
      },
      {
        id: "reconciliation",
        title: "BOM reconciliation",
        url: "/dashboard/reports/reconciliation",
        icon: Scale,
        permission: "report:read",
      },
    ],
  },
  {
    id: 4,
    label: "System",
    items: [
      { id: "wms-users", title: "Users", url: "/dashboard/admin/users", icon: Users, permission: "user:manage" },
      { id: "wms-account", title: "Account", url: "/dashboard/account", icon: UserRound },
    ],
  },
  {
    id: 5,
    label: "Dashboards",
    items: [
      {
        id: "default",
        title: "Default",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        id: "crm",
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        id: "finance",
        title: "Finance",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        id: "analytics",
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: Gauge,
      },
      {
        id: "productivity",
        title: "Productivity",
        url: "/dashboard/productivity",
        icon: ListTodo,
      },
      {
        id: "ecommerce",
        title: "E-commerce",
        url: "/dashboard/ecommerce",
        icon: ShoppingBag,
      },
      {
        id: "academy",
        title: "Academy",
        url: "/dashboard/academy",
        icon: GraduationCap,
      },
      {
        id: "logistics",
        title: "Logistics",
        url: "/dashboard/logistics",
        icon: Forklift,
      },
      {
        id: "infrastructure",
        title: "Infrastructure",
        url: "/dashboard/infrastructure",
        icon: Server,
      },
      {
        id: "file-manager",
        title: "File Manager",
        url: "/dashboard/file-manager",
        icon: FolderOpen,
      },
      {
        id: "patient-monitoring",
        title: "Patient Monitoring",
        url: "/dashboard/patient-monitoring",
        icon: HeartPulse,
      },
    ],
  },
  {
    id: 2,
    label: "Pages",
    items: [
      {
        id: "email",
        title: "Email",
        url: "/dashboard/mail",
        icon: Mail,
      },
      {
        id: "chat",
        title: "Chat",
        url: "/dashboard/chat",
        icon: MessageSquare,
      },
      {
        id: "calendar",
        title: "Calendar",
        url: "/dashboard/calendar",
        icon: Calendar,
      },
      {
        id: "kanban",
        title: "Kanban",
        url: "/dashboard/kanban",
        icon: Kanban,
      },
      {
        id: "tasks",
        title: "Tasks",
        url: "/dashboard/tasks",
        icon: CheckSquare,
      },
      {
        id: "invoice",
        title: "Invoice",
        url: "/dashboard/invoice",
        icon: ReceiptText,
      },
      {
        id: "profile",
        title: "Profile",
        url: "/dashboard/profile",
        icon: UserRound,
      },
      {
        id: "users",
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        id: "roles",
        title: "Roles",
        url: "/dashboard/roles",
        icon: Lock,
      },
      {
        id: "authentication",
        title: "Authentication",
        icon: Fingerprint,
        subItems: [
          { id: "auth-login-v1", title: "Login v1", url: "/auth/v1/login", newTab: true },
          { id: "auth-login-v2", title: "Login v2", url: "/auth/v2/login", newTab: true },
          { id: "auth-register-v1", title: "Register v1", url: "/auth/v1/register", newTab: true },
          { id: "auth-register-v2", title: "Register v2", url: "/auth/v2/register", newTab: true },
        ],
      },
      {
        id: "warehouse",
        title: "Warehouse",
        icon: Building,
        subItems: [
          { id: "items", title: "Items", url: "/dashboard/warehouse/items" },
          { id: "categories", title: "Categories", url: "/dashboard/warehouse/categories" },
          { id: "partners", title: "Partners", url: "/dashboard/warehouse/partners" },
          { id: "inventory", title: "Inventory", url: "/dashboard/warehouse/inventory" },
          { id: "vouchers", title: "Vouchers", url: "/dashboard/warehouse/vouchers" },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Legacy",
    items: [
      {
        id: "legacy-dashboards",
        title: "Dashboards",
        subItems: [
          { id: "legacy-default", title: "Default V1", url: "/dashboard/default-v1" },
          { id: "legacy-crm", title: "CRM V1", url: "/dashboard/crm-v1" },
          { id: "legacy-finance", title: "Finance V1", url: "/dashboard/finance-v1" },
          { id: "legacy-analytics", title: "Analytics V1", url: "/dashboard/analytics-v1" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Misc",
    items: [
      {
        id: "others",
        title: "Others",
        url: "/dashboard/coming-soon",
        icon: SquareArrowUpRight,
        badge: "soon",
        disabled: true,
      },
    ],
  },
];

/** Keeps only the groups and items the role is allowed to open. UI convenience only: the server re-checks. */
export function filterNavByRole(groups: readonly NavGroup[], role: Role, t: TFunction): NavGroup[] {
  const allowed = (permission?: Permission) => !permission || can(role, permission);
  return groups
    .map((group) => ({
      ...group,
      label: group.label ? t(group.label) : undefined,
      items: group.items
        .filter((item) => allowed(item.permission))
        .map((item: NavMainItem) =>
          item.subItems
            ? {
                ...item,
                title: t(item.title),
                subItems: item.subItems
                  .filter((sub) => allowed(sub.permission))
                  .map((sub) => ({ ...sub, title: t(sub.title) })),
              }
            : { ...item, title: t(item.title) },
        ),
    }))
    .filter((group) => group.items.length > 0);
}
