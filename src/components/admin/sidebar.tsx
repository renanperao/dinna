"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, History, ChefHat,
  TrendingUp, Package, Users, Star, Bike,
  BookOpen, BarChart2, ShoppingBag, Ticket, ChevronDown, ChevronRight, Store,
  LogOut, Check,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth";

interface SidebarMembership {
  slug: string;
  name: string;
}

interface AdminSidebarUser {
  name: string;
  email: string | null;
  role: string | null;
  isSuperadmin: boolean;
  memberships: SidebarMembership[];
}

interface AdminSidebarProps {
  slug: string;
  restaurantName: string;
  user?: AdminSidebarUser | null;
  authConfigured?: boolean;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: (s: string) => string;
  badge?: string;
  children?: NavItem[];
}

const NAV: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: (s) => `/admin/${s}`,
  },
  {
    label: "Gestão de pedidos",
    icon: ClipboardList,
    href: (s) => `/admin/${s}/orders`,
  },
  {
    label: "KDS — Cozinha",
    icon: ChefHat,
    href: (s) => `/kitchen/${s}`,
  },
  {
    label: "Desempenho",
    icon: TrendingUp,
    children: [
      { label: "Vendas",         icon: BarChart2,   href: (s) => `/admin/${s}/performance` },
      { label: "Produtos",       icon: Package,     href: (s) => `/admin/${s}/performance/products` },
      { label: "Clientes",       icon: Users,       href: (s) => `/admin/${s}/performance/customers` },
      { label: "Cancelamentos",  icon: ShoppingBag, href: (s) => `/admin/${s}/performance/cancellations` },
    ],
  },
  {
    label: "Histórico de pedidos",
    icon: History,
    href: (s) => `/admin/${s}/history`,
  },
  {
    label: "Clientes",
    icon: Users,
    href: (s) => `/admin/${s}/customers`,
  },
  {
    label: "Avaliações",
    icon: Star,
    href: (s) => `/admin/${s}/reviews`,
  },
  {
    label: "Catálogo",
    icon: BookOpen,
    href: (s) => `/admin/${s}/menu`,
  },
  {
    label: "Cupons e descontos",
    icon: Ticket,
    href: (s) => `/admin/${s}/coupons`,
  },
  {
    label: "Delivery",
    icon: Bike,
    href: (s) => `/admin/${s}/delivery`,
  },
  {
    label: "Equipe",
    icon: Users,
    href: (s) => `/admin/${s}/team`,
  },
  {
    label: "Minha empresa",
    icon: Store,
    href: (s) => `/admin/${s}/settings`,
  },
];

export function AdminSidebar({
  slug,
  restaurantName,
  user,
  authConfigured,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(["Desempenho"]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();

  function handleSignOut() {
    startSignOut(async () => {
      try {
        await signOut();
      } catch (err) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          toast.error("Erro ao sair");
        }
      }
    });
  }

  function toggleGroup(label: string) {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  }

  function isActive(href: string) {
    return pathname === href;
  }

  function renderItem(item: NavItem, depth = 0) {
    if (item.children) {
      const open = openGroups.includes(item.label);
      const anyChildActive = item.children.some(
        (c) => c.href && isActive(c.href(slug)),
      );
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleGroup(item.label)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              anyChildActive ? "text-violet-700" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className={cn("h-4 w-4", anyChildActive ? "text-violet-600" : "text-neutral-400")} />
              {item.label}
            </span>
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
            )}
          </button>
          {open && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-neutral-100 pl-3">
              {item.children.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    if (!item.href) return null;
    const href = item.href(slug);
    const active = isActive(href);

    return (
      <Link
        key={item.label}
        href={href}
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-violet-50 text-violet-700"
            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
        )}
      >
        <span className="flex items-center gap-3">
          <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-violet-600" : "text-neutral-400")} />
          <span className="truncate">{item.label}</span>
        </span>
        {item.badge && (
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
            {item.badge}
          </span>
        )}
        {active && !item.badge && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-violet-400" />}
      </Link>
    );
  }

  const hasMultipleRestaurants = (user?.memberships.length ?? 0) > 1;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-neutral-200 bg-white">
      {/* Brand + restaurant switcher */}
      <div className="relative border-b border-neutral-100">
        <button
          type="button"
          onClick={() => hasMultipleRestaurants && setSwitcherOpen((v) => !v)}
          disabled={!hasMultipleRestaurants}
          className={cn(
            "flex w-full items-center gap-3 px-5 py-4 text-left",
            hasMultipleRestaurants && "hover:bg-neutral-50",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 text-sm font-black text-white shadow-sm">
            {restaurantName[0]?.toUpperCase() ?? "N"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-neutral-900">{restaurantName}</p>
            <p className="text-xs text-neutral-500">
              {hasMultipleRestaurants
                ? `${user!.memberships.length} pizzarias · trocar`
                : "Portal do Parceiro"}
            </p>
          </div>
          {hasMultipleRestaurants && (
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-neutral-400 transition-transform",
                switcherOpen && "rotate-180",
              )}
            />
          )}
        </button>

        {hasMultipleRestaurants && switcherOpen && (
          <div className="absolute left-3 right-3 top-full z-20 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
            <ul className="max-h-72 overflow-y-auto py-1">
              {user!.memberships.map((m) => {
                const isCurrent = m.slug === slug;
                return (
                  <li key={m.slug}>
                    <Link
                      href={`/admin/${m.slug}`}
                      onClick={() => setSwitcherOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-neutral-50",
                        isCurrent ? "bg-violet-50/60 text-violet-700" : "text-neutral-700",
                      )}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold text-white">
                        {m.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="flex-1 truncate">{m.name}</span>
                      {isCurrent && <Check className="h-3.5 w-3.5 text-violet-600" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {user?.isSuperadmin && (
          <Link
            href="/admin"
            className="mb-1 flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Todos os clientes
          </Link>
        )}
        {NAV.map((item) => renderItem(item))}
      </nav>

      {/* User card */}
      {user && (
        <div className="border-t border-neutral-100 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold text-white">
              {(user.name || "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-neutral-900">{user.name}</p>
              <p className="truncate text-[10px] text-neutral-500">
                {user.role ? `${user.role} · ` : ""}
                {user.email ?? "sem auth"}
              </p>
            </div>
            {authConfigured && (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                title="Sair"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="space-y-1 border-t border-neutral-100 p-3">
        <Link
          href="#"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-50"
        >
          Dúvidas?
        </Link>
        <p className="px-3 py-1 text-[10px] text-neutral-300">NexoMenu · v0.1.0-beta</p>
      </div>
    </aside>
  );
}
