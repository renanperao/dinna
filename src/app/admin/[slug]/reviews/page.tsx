import { notFound } from "next/navigation";
import { Star, MessageSquare } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }> }

// Mock reviews for the prototype
const MOCK_REVIEWS = [
  { name: "João S.", rating: 5, comment: "Pizza chegou quente e no tempo certo! Calabresa simplesmente perfeita.", time: "há 2 horas", order: "#47" },
  { name: "Marina L.", rating: 5, comment: "Atendimento incrível e a pizza de quatro queijos estava divina. Já virei cliente fiel!", time: "há 5 horas", order: "#46" },
  { name: "Pedro A.", rating: 4, comment: "Pizza boa, entrega rápida. Só achei a borda de catupiry um pouco salgada.", time: "ontem", order: "#44" },
  { name: "Carla M.", rating: 5, comment: "Melhor restaurante da região! Pedido correto, embalagem ótima e sabor incrível.", time: "ontem", order: "#43" },
  { name: "Roberto F.", rating: 3, comment: "Pizza boa mas demorou mais do que o esperado. Esperava 40min e veio em 1h.", time: "há 2 dias", order: "#40" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`} />
      ))}
    </div>
  );
}

export default async function ReviewsPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const avgRating = (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1);
  const dist = [5,4,3,2,1].map(star => ({ star, count: MOCK_REVIEWS.filter(r => r.rating === star).length }));

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Avaliações</h1>
          <p className="text-sm text-neutral-500">Feedback dos seus clientes</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
          ⭐ {avgRating} / 5.0
        </span>
      </div>

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
        <span>As avaliações serão coletadas automaticamente por WhatsApp após a entrega. <strong>Preview com dados de exemplo.</strong></span>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Score summary */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-neutral-900">Resumo</h2>
          <div className="mb-4 text-center">
            <p className="text-6xl font-black text-neutral-900">{avgRating}</p>
            <Stars rating={Math.round(Number(avgRating))} />
            <p className="mt-1 text-xs text-neutral-400">{MOCK_REVIEWS.length} avaliações</p>
          </div>
          <div className="space-y-2">
            {dist.map(d => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-right text-neutral-500">{d.star}★</span>
                <div className="flex-1 overflow-hidden rounded-full bg-neutral-100 h-2">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(d.count / MOCK_REVIEWS.length) * 100}%` }} />
                </div>
                <span className="w-4 text-neutral-400">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reviews */}
        <div className="space-y-4 lg:col-span-2">
          {MOCK_REVIEWS.map((r, i) => (
            <div key={i} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-sm font-bold text-white">
                    {r.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{r.name}</p>
                    <Stars rating={r.rating} />
                  </div>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  <p>{r.time}</p>
                  <p>Pedido {r.order}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{r.comment}</p>
              <button className="mt-3 text-xs font-semibold text-violet-600 hover:underline">
                Responder cliente →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
