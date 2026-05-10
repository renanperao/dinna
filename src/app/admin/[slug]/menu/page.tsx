import { notFound } from "next/navigation";
import { getRestaurantMenu } from "@/lib/queries/menu";
import { listCategoriesForSelect, type ProductInput } from "@/actions/products";
import { MenuAdminClient } from "@/components/admin/menu-admin-client";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MenuAdminPage({ params }: PageProps) {
  const { slug } = await params;
  const [menu, categoryOptions] = await Promise.all([
    getRestaurantMenu(slug),
    listCategoriesForSelect(slug),
  ]);
  if (!menu) notFound();

  const categories = menu.categories.map((c) => ({
    id: c.id,
    name: c.name,
    products: c.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      type: p.type as ProductInput["type"],
      categoryId: p.categoryId,
      basePrice: p.basePrice,
      isAvailable: p.isAvailable,
      sizes: p.sizes.map((s) => ({ id: s.id, name: s.name, price: s.price })),
    })),
  }));

  return (
    <div className="px-5 py-6 sm:px-8">
      <MenuAdminClient slug={slug} categories={categories} categoryOptions={categoryOptions} />
    </div>
  );
}
