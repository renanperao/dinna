"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { inviteTeamMember } from "@/actions/team";

const ROLE_OPTIONS = [
  { value: "kitchen", label: "Cozinha", description: "Vê só o KDS" },
  { value: "operator", label: "Atendente", description: "Atende pedidos" },
  { value: "delivery", label: "Entregador", description: "Vê só entregas" },
] as const;

type Role = (typeof ROLE_OPTIONS)[number]["value"];

interface InviteFormProps {
  restaurantSlug: string;
}

export function InviteForm({ restaurantSlug }: InviteFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("kitchen");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteTeamMember({ restaurantSlug, name, email, role });
      if (result.ok) {
        toast.success(`Convite enviado para ${email}`);
        setName("");
        setEmail("");
        setRole("kitchen");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6"
    >
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-violet-600" />
        <h2 className="text-sm font-bold text-neutral-900">Convidar funcionário</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Nome
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maria Silva"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            E-mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@exemplo.com"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Função
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map((opt) => {
            const selected = role === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <p className={`text-sm font-bold ${selected ? "text-violet-700" : "text-neutral-900"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-neutral-500">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Enviando..." : "Enviar convite por e-mail"}
      </button>

      <p className="text-center text-xs text-neutral-400">
        A pessoa vai receber um link por e-mail pra criar a senha e entrar.
      </p>
    </form>
  );
}
