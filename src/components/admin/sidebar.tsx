"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, History, ChefHat,
  TrendingUp, Package, Users, Star, Bike,
  BookOpen, BarChart2, ShoppingBag, Ticket, ChevronDown, ChevronRight, Store,
  LogOut,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth";

interface AdminSidebarUser {
  name: string;
  email: string | null;
  role: string | null;
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
  const [signingOut, startSignOut] = useTransition();

  function handleSignOut() {
    startSignOut(async () => {
      try {
        await signOut();
      } catch (err) {
        // signOut redirects, so the thrown NEXT_REDIRECT is expected; only show toast for real errors
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

  return (
    <aside className="flex h-full w-64 flex-col border-r border-neutral-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 text-sm font-black text-white shadow-sm">
          D
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-neutral-900">{restaurantName}</p>
          <p className="text-xs text-neutral-500">Portal do Parceiro</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
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
        <p className="px-3 py-1 text-[10px] text-neutral-300">Dinna · v0.1.0-beta</p>
      </div>
    </aside>
  );
}
