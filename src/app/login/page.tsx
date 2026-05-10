import { redirect } from "next/navigation";
import { Pizza } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const session = await getSession();

  // Already logged in: redirect immediately
  if (session.user) {
    redirect(sp.next ?? "/admin");
  }

  const configured = isSupabaseConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-neutral-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-lg">
            <Pizza className="h-5 w-5" />
          </div>
          <span className="text-xl font-black tracking-tight">Dinna</span>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-1 text-xl font-bold text-neutral-900">Portal do Parceiro</h1>
          <p className="mb-6 text-sm text-neutral-500">
            Entre com seu e-mail e senha para acessar o painel.
          </p>

          {!configured ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-bold">Auth não configurado</p>
              <p className="mt-1 text-xs">
                Defina <code className="rounded bg-white px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
                <code className="rounded bg-white px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no{" "}
                <code className="rounded bg-white px-1">.env.local</code> para habilitar login.
                Em desenvolvimento, o middleware libera o acesso automaticamente sem auth.
              </p>
            </div>
          ) : (
            <LoginForm next={sp.next} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Problemas para acessar? Fale com o suporte.
        </p>
      </div>
    </main>
  );
}
