"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, LayoutDashboard, Pizza } from "lucide-react";

interface DemoNavProps {
  slug: string;
}

const views = [
  { label: "Cardápio", href: (slug: string) => `/${slug}`, icon: Pizza, color: "bg-red-600" },
  { label: "Cozinha", href: (slug: string) => `/kitchen/${slug}`, icon: ChefHat, color: "bg-amber-500" },
  { label: "Admin", href: (slug: string) => `/admin/${slug}`, icon: LayoutDashboard, color: "bg-violet-600" },
];

export function DemoNav({ slug }: DemoNavProps) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 border-t border-white/10 bg-neutral-900/95 px-4 py-2 backdrop-blur sm:bottom-4 sm:left-auto sm:right-4 sm:flex-col sm:rounded-2xl sm:border sm:border-white/10 sm:py-3 sm:shadow-2xl">
      <p className="hidden text-[10px] font-semibold uppercase tracking-widest text-neutral-500 sm:block">
        Demo
      </p>
      {views.map((v) => {
        const href = v.href(slug);
        const active = pathname === href || pathname.startsWith(href + "/");
        const Icon = v.icon;
        return (
          <Link
            key={v.label}
            href={href}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:w-full ${
              active
                ? `${v.color} text-white`
                : "text-neutral-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{v.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
