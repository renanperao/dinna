import Link from "next/link";
import { ShieldX, LogOut, Store } from "lucide-react";
import { signOut } from "@/actions/auth";

interface NoAccessScreenProps {
  reason: "wrong-role" | "wrong-restaurant";
  role?: string | null;
  yourSlug?: string | null;
}

export function NoAccessScreen({ reason, role, yourSlug }: NoAccessScreenProps) {
  const isWrongRole = reason === "wrong-role";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldX className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="mb-1 text-xl font-bold text-neutral-900">Sem acesso</h1>
        <p className="mb-6 text-sm text-neutral-600">
          {isWrongRole ? (
            <>
              Seu tipo de usuário (<strong>{role ?? "—"}</strong>) não tem permissão para esta tela.
            </>
          ) : (
            <>Você não pertence a este restaurante.</>
          )}
        </p>

        <div className="space-y-2">
          {yourSlug && (
            <Link
              href={`/admin/${yourSlug}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Store className="h-4 w-4" />
              Ir para meu restaurante
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
