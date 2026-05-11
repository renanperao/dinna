"use client";

import { useTransition } from "react";
import { Trash2, Loader2, Crown, ChefHat, Bike, Users } from "lucide-react";
import { toast } from "sonner";
import { removeTeamMember } from "@/actions/team";
import type { TeamMember } from "@/lib/queries/team";

const ROLE_META: Record<TeamMember["role"], { label: string; icon: React.ElementType; color: string }> = {
  owner:    { label: "Dono",        icon: Crown,   color: "text-amber-600 bg-amber-50" },
  kitchen:  { label: "Cozinha",     icon: ChefHat, color: "text-orange-600 bg-orange-50" },
  operator: { label: "Atendente",   icon: Users,   color: "text-blue-600 bg-blue-50" },
  delivery: { label: "Entregador",  icon: Bike,    color: "text-emerald-600 bg-emerald-50" },
};

interface TeamListProps {
  members: TeamMember[];
  currentUserId: string | null;
}

export function TeamList({ members, currentUserId }: TeamListProps) {
  const [pending, startTransition] = useTransition();

  function handleRemove(member: TeamMember) {
    if (member.role === "owner") {
      toast.error("O dono não pode ser removido");
      return;
    }
    if (!confirm(`Remover ${member.name}? Esta ação não pode ser desfeita.`)) return;

    startTransition(async () => {
      const result = await removeTeamMember(member.id);
      if (result.ok) {
        toast.success(`${member.name} removido`);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
        <p className="text-sm font-semibold text-neutral-900">Nenhum funcionário ainda</p>
        <p className="mt-1 text-xs text-neutral-500">
          Use o formulário acima pra convidar sua equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <ul className="divide-y divide-neutral-100">
        {members.map((member) => {
          const meta = ROLE_META[member.role];
          const Icon = meta.icon;
          const isSelf = member.id === currentUserId;
          const canRemove = !isSelf && member.role !== "owner";

          return (
            <li
              key={member.id}
              className="flex items-center gap-4 px-5 py-4"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-neutral-900">{member.name}</p>
                  {isSelf && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                      você
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-neutral-500">{member.email}</p>
              </div>

              <span className="hidden text-xs font-semibold text-neutral-600 sm:block">
                {meta.label}
              </span>

              {canRemove && (
                <button
                  type="button"
                  onClick={() => handleRemove(member)}
                  disabled={pending}
                  title="Remover"
                  className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
