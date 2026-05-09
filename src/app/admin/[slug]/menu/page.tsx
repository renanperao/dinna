import { notFound } from "next/navigation";
import { BookOpen, PlusCircle, Eye, EyeOff, Pizza } from "lucide-react";
import { getRestaurantMenu } from "@/lib/queries/menu";
import { formatBRL } from "@/lib/utils";

interface PageProps { params: Promise<{ slug: string }> }

export default async function MenuAdminPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getRestaurantMenu(slug);
  if (!menu) notFound();

  const totalProducts = menu.categories.reduce((s, c) => s + c.products.length, 0);

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Catálogo</h1>
          <p className="text-sm text-neutral-500">{menu.categories.length} categorias · {totalProducts} produtos</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">
          <PlusCircle className="h-3.5 w-3.5" /> Novo produto
        </button>
      </div>

      <div className="space-y-6">
        {menu.categories.map(cat => (
          <div key={cat.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-3">
              <h2 className="font-bold text-neutral-800">{cat.name}</h2>
              <span className="text-xs text-neutral-400">{cat.products.length} itens</span>
            </div>
            <div className="divide-y divide-neutral-50">
              {cat.products.map(product => {
                const minPrice = product.sizes.length > 0
                  ? Math.min(...product.sizes.map(s => Number(s.price)))
                  : Number(product.basePrice ?? 0);
                const maxPrice = product.sizes.length > 0
                  ? Math.max(...product.sizes.map(s => Number(s.price)))
                  : Number(product.basePrice ?? 0);

                return (
                  <div key={product.id} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                        <Pizza className="h-6 w-6 text-neutral-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-neutral-400 truncate">{product.description}</p>
                      )}
                      {product.sizes.length > 0 && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {product.sizes.map(s => s.name).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-neutral-900">
                        {minPrice === maxPrice ? formatBRL(minPrice) : `${formatBRL(minPrice)} – ${formatBRL(maxPrice)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <Eye className="h-3 w-3" /> Ativo
                      </span>
                      <button className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
