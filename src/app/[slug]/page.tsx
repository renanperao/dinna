import { notFound } from "next/navigation";
import { RestaurantHeader } from "@/components/menu/restaurant-header";
import { MenuPageClient } from "@/components/menu/menu-page-client";
import { DemoNav } from "@/components/demo-nav";
import { getRestaurantMenu } from "@/lib/queries/menu";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getRestaurantMenu(slug);
  if (!menu) return { title: "Restaurante não encontrado" };
  return {
    title: `${menu.restaurant.name} · Cardápio`,
    description: menu.restaurant.description ?? `Faça seu pedido no ${menu.restaurant.name}`,
  };
}

export default async function RestaurantPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getRestaurantMenu(slug);
  if (!menu) notFound();

  return (
    <main className="min-h-screen bg-neutral-50">
      <RestaurantHeader restaurant={menu.restaurant} />
      <MenuPageClient
        restaurant={menu.restaurant}
        categories={menu.categories}
        options={menu.options}
      />
      <DemoNav slug={slug} />
    </main>
  );
}
