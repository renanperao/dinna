"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Lock, User, Store, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { signUpOwner } from "@/actions/auth";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await signUpOwner({
        name,
        email,
        password,
        restaurantName,
        restaurantPhone,
      });
      if (result.ok) {
        if (result.needsEmailConfirmation) {
          setDone(true);
        } else {
          toast.success("Conta criada! Entrando...");
          window.location.href = "/admin";
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Confirme seu e-mail</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Mandamos um link de confirmação para <strong>{email}</strong>.<br />
            Clique no link para ativar sua conta.
          </p>
        </div>
        <a
          href="/login"
          className="inline-block text-xs font-semibold text-violet-600 hover:underline"
        >
          Voltar para o login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Seu nome"
        icon={User}
        value={name}
        onChange={setName}
        placeholder="Como você quer ser chamado"
        autoComplete="name"
        required
      />
      <Field
        label="E-mail"
        icon={Mail}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="voce@restaurante.com.br"
        autoComplete="email"
        required
      />
      <Field
        label="Senha"
        icon={Lock}
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        minLength={8}
        required
      />

      <div className="my-1 border-t border-neutral-100 pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Sobre seu restaurante
        </p>
        <div className="space-y-4">
          <Field
            label="Nome do restaurante"
            icon={Store}
            value={restaurantName}
            onChange={setRestaurantName}
            placeholder="Pizzaria do João"
            required
          />
          <Field
            label="WhatsApp"
            icon={Phone}
            value={restaurantPhone}
            onChange={setRestaurantPhone}
            placeholder="+55 11 99999-0000"
            autoComplete="tel"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="text-center text-xs text-neutral-400">
        Já tem uma conta?{" "}
        <a href="/login" className="font-semibold text-violet-600 hover:underline">
          Entrar
        </a>
      </p>
    </form>
  );
}

interface FieldProps {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}

function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  required,
}: FieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type={type}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>
    </div>
  );
}
