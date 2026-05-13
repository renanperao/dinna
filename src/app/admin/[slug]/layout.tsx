import { notFound, redirect } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/queries/menu";
import { AdminSidebar } from "@/components/admin/sidebar";
import { findMembership, getSession } from "@/lib/auth";
import { NoAccessScreen } from "@/components/auth/no-access-screen";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AdminLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const [restaurant, session] = await Promise.all([
    getRestaurantBySlug(slug),
    getSession(),
  ]);
  if (!restaurant) notFound();

  let activeRole: string | null = null;

  // Auth: superadmin OU membership com role 'owner' no slug. Bypass (dev) libera.
  if (!session.bypass) {
    if (!session.user) {
      redirect(`/login?next=/admin/${slug}`);
    }

    const isSuperadmin = session.user.isSuperadmin;
    const membership = findMembership(session, slug);

    if (!isSuperadmin && !membership) {
      const fallback = session.user.memberships[0]?.restaurantSlug ?? null;
      return <NoAccessScreen reason="wrong-restaurant" yourSlug={fallback} />;
    }

    if (!isSuperadmin && membership && membership.role !== "owner") {
      const fallback = session.user.memberships[0]?.restaurantSlug ?? null;
      return <NoAccessScreen reason="wrong-role" role={membership.role} yourSlug={fallback} />;
    }

    activeRole = isSuperadmin ? "superadmin" : (membership?.role ?? null);
  }

  const sidebarUser = session.user
    ? {
        name: session.user.name ?? session.user.email ?? "Usuário",
        email: session.user.email,
        role: activeRole,
        isSuperadmin: session.user.isSuperadmin,
        memberships: session.user.memberships.map((m) => ({
          slug: m.restaurantSlug,
          name: m.restaurantName,
        })),
      }
    : session.bypass
      ? {
          name: "Modo dev (sem auth)",
          email: null,
          role: null,
          isSuperadmin: false,
          memberships: [],
        }
      : null;

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex lg:shrink-0">
        <AdminSidebar
          slug={slug}
          restaurantName={restaurant.name}
          user={sidebarUser}
          authConfigured={session.configured}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-5 py-4 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            A
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-900">{restaurant.name}</p>
            <p className="text-xs text-neutral-500">Admin</p>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">{children}</main>
      </div>

    </div>
  );
}
