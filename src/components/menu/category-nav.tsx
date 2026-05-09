"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  categories: Array<{ id: string; name: string }>;
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const [activeId, setActiveId] = useState<string | null>(categories[0]?.id ?? null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!categories.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    for (const cat of categories) {
      const el = document.getElementById(cat.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const button = navRef.current.querySelector<HTMLButtonElement>(
      `[data-cat-id="${activeId}"]`,
    );
    button?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  return (
    <div className="sticky top-0 z-30 -mx-4 mt-6 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2">
      <div ref={navRef} className="no-scrollbar flex gap-1 overflow-x-auto py-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            data-cat-id={cat.id}
            onClick={() => {
              const el = document.getElementById(cat.id);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeId === cat.id
                ? "bg-[var(--color-brand)] text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
