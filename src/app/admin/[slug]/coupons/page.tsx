import { notFound } from "next/navigation";
import { Ticket, Calendar, Users } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";
import { getCoupons } from "@/lib/queries/coupons";
import { CouponsListClient } from "@/components/admin/coupons-list-client";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CouponsPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const coupons = await getCoupons(restaurantId);

  const stats = {
    active: coupons.filter((c) => c.isActive).length,
    totalUses: coupons.reduce((s, c) => s + (c.usesCount ?? 0), 0),
    inactive: coupons.filter((c) => !c.isActive).length,
  };

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          {
            label: "Ativos",
            value: stats.active,
            icon: Ticket,
            color: "bg-violet-100 text-violet-600",
          },
          {
            label: "Total de usos",
            value: stats.totalUses,
            icon: Users,
            color: "bg-blue-100 text-blue-600",
          },
          {
            label: "Inativos",
            value: stats.inactive,
            icon: Calendar,
            color: "bg-neutral-100 text-neutral-500",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {card.label}
                </p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-neutral-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <CouponsListClient slug={slug} coupons={coupons} />
    </div>
  );
}
