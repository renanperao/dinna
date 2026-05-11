import { redirect } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getSession } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function SetPasswordPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const session = await getSession();

  if (!session.user) {
    redirect("/login");
  }

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
          <h1 className="mb-1 text-xl font-bold text-neutral-900">Defina sua senha</h1>
          <p className="mb-6 text-sm text-neutral-500">
            Bem-vindo! Crie uma senha pra acessar sua conta.
          </p>

          <SetPasswordForm next={sp.next} />
        </div>
      </div>
    </main>
  );
}
