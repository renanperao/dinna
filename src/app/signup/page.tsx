import { redirect } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { SignupForm } from "@/components/auth/signup-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export default async function SignupPage() {
  const session = await getSession();
  if (session.user) {
    redirect("/admin");
  }

  const configured = isSupabaseConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-neutral-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-lg">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <span className="text-xl font-black tracking-tight">NexoMenu</span>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-1 text-xl font-bold text-neutral-900">Criar conta</h1>
          <p className="mb-6 text-sm text-neutral-500">
            Crie sua conta de gestor e seu restaurante em um único passo.
          </p>

          {!configured ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-bold">Auth não configurado</p>
              <p className="mt-1 text-xs">
                Configure o Supabase no <code className="rounded bg-white px-1">.env.local</code>{" "}
                para habilitar o cadastro.
              </p>
            </div>
          ) : (
            <SignupForm />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Ao criar uma conta você concorda com nossos termos de uso.
        </p>
      </div>
    </main>
  );
}
