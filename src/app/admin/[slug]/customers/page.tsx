import { notFound } from "next/navigation";
import { Users, Phone, ShoppingBag, TrendingUp, Search } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";
import { getCustomerList } from "@/lib/queries/analytics";
import { formatBRL, formatPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ slug: string }> }

function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d atrás`;
  return date.toLocaleDateString("pt-BR");
}

function CustomerTag({ totalSpent }: { totalSpent: number }) {
  if (totalSpent >= 300) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">⭐ VIP</span>;
  if (totalSpent >= 100) return <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">Frequente</span>;
  return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">Novo</span>;
}

export default async function CustomersPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const customerList = await getCustomerList(restaurantId);

  const stats = {
    total: customerList.length,
    vip: customerList.filter((c) => c.totalSpent >= 300).length,
    frequent: customerList.filter((c) => c.totalSpent >= 100 && c.totalSpent < 300).length,
    totalRevenue: customerList.reduce((s, c) => s + c.totalSpent, 0),
  };

  return (
    <div className="px-5 py-6 sm:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
        <p className="text-sm text-neutral-500">Base de clientes cadastrados</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total de clientes", value: stats.total.toString(), icon: Users, color: "bg-violet-600" },
          { label: "VIP (R$300+)", value: stats.vip.toString(), icon: TrendingUp, color: "bg-amber-500" },
          { label: "Frequentes", value: stats.frequent.toString(), icon: ShoppingBag, color: "bg-blue-600" },
          { label: "Receita gerada", value: formatBRL(stats.totalRevenue), icon: TrendingUp, color: "bg-emerald-600" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{card.label}</p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.color} text-white`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-xl font-black text-neutral-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Pesquisar por nome ou telefone..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <select className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none">
          <option>Todos</option>
          <option>VIP</option>
          <option>Frequentes</option>
          <option>Novos</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {customerList.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-400">
            <Users className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhum cliente ainda.</p>
            <p className="text-xs">Os clientes aparecem ao finalizar um pedido com telefone.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Telefone</th>
                  <th className="px-5 py-3 text-center">Pedidos</th>
                  <th className="px-5 py-3 text-right">Total gasto</th>
                  <th className="px-5 py-3 text-right">Ticket médio</th>
                  <th className="px-5 py-3 text-right">Último pedido</th>
                  <th className="px-5 py-3">Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {customerList.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold text-white">
                          {(c.name ?? "?")[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-neutral-900">{c.name ?? "Cliente"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-neutral-600">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-neutral-400" />
                        {formatPhone(c.phone)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                        {c.totalOrders}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-neutral-900">
                      {formatBRL(c.totalSpent)}
                    </td>
                    <td className="px-5 py-4 text-right text-neutral-600">{formatBRL(c.avgTicket)}</td>
                    <td className="px-5 py-4 text-right text-neutral-500 text-xs">{timeAgo(c.lastOrderAt)}</td>
                    <td className="px-5 py-4">
                      <CustomerTag totalSpent={c.totalSpent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400">
              <span>Registros por página: 20</span>
              <span>1–{customerList.length} de {customerList.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
