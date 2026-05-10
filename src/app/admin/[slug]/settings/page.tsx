import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/queries/menu";
import { SettingsForm } from "@/components/admin/settings-form";
import { BusinessHoursForm } from "@/components/admin/business-hours-form";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export default async function SettingsPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const address = restaurant.address as
    | {
        street?: string;
        number?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        cep?: string;
      }
    | null;
  const hours = restaurant.businessHours as Partial<
    Record<DayKey, { open?: string; close?: string; closed?: boolean }>
  > | null;

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Minha empresa</h1>
        <p className="text-sm text-neutral-500">Configurações do seu restaurante</p>
      </div>

      <div className="space-y-6">
        <SettingsForm
          initial={{
            slug: restaurant.slug,
            name: restaurant.name,
            description: restaurant.description,
            phone: restaurant.phone,
            whatsapp: restaurant.whatsapp,
            primaryColor: restaurant.primaryColor,
            address,
          }}
        />

        <BusinessHoursForm slug={restaurant.slug} initial={hours} />
      </div>
    </div>
  );
}
