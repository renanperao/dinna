"use client";

import { useState, useTransition } from "react";
import { Save, Store, Phone, MapPin, Palette, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateRestaurant, type UpdateRestaurantInput } from "@/actions/update-restaurant";
import { formatPhone } from "@/lib/utils";

interface RestaurantAddress {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

interface SettingsFormProps {
  initial: {
    slug: string;
    name: string;
    description: string | null;
    phone: string;
    whatsapp: string;
    primaryColor: string | null;
    address: RestaurantAddress | null;
  };
}

export function SettingsForm({ initial }: SettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [phone, setPhone] = useState(formatPhone(initial.phone));
  const [whatsapp, setWhatsapp] = useState(formatPhone(initial.whatsapp));
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor ?? "#7C3AED");
  const [street, setStreet] = useState(initial.address?.street ?? "");
  const [number, setNumber] = useState(initial.address?.number ?? "");
  const [neighborhood, setNeighborhood] = useState(initial.address?.neighborhood ?? "");
  const [city, setCity] = useState(initial.address?.city ?? "");
  const [state, setState] = useState(initial.address?.state ?? "");
  const [cep, setCep] = useState(initial.address?.cep ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload: UpdateRestaurantInput = {
      slug: initial.slug,
      name: name.trim(),
      description: description.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      primaryColor,
      address: {
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        cep: cep.trim(),
      },
    };

    startTransition(async () => {
      const result = await updateRestaurant(payload);
      if (result.ok) {
        toast.success("Configurações salvas");
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    });
  }

  function fieldClass(key: string) {
    return `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${
      errors[key]
        ? "border-red-300 focus:border-red-400"
        : "border-neutral-200 focus:border-violet-400"
    }`;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Store className="h-4 w-4 text-violet-600" />
          <h2 className="font-bold text-neutral-900">Dados do restaurante</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Nome
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass("name")}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Slug (URL)
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              dinna.app/<strong className="text-neutral-800">{initial.slug}</strong>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Telefone
            </label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-neutral-400" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={fieldClass("phone")}
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              WhatsApp
            </label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={fieldClass("whatsapp")}
            />
            {errors.whatsapp && <p className="mt-1 text-xs text-red-600">{errors.whatsapp}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${fieldClass("description")} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-violet-600" />
          <h2 className="font-bold text-neutral-900">Endereço</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Rua
            </label>
            <input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={fieldClass("address.street")}
            />
            {errors["address.street"] && (
              <p className="mt-1 text-xs text-red-600">{errors["address.street"]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Número
            </label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className={fieldClass("address.number")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              CEP
            </label>
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
              className={fieldClass("address.cep")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Bairro
            </label>
            <input
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className={fieldClass("address.neighborhood")}
            />
            {errors["address.neighborhood"] && (
              <p className="mt-1 text-xs text-red-600">{errors["address.neighborhood"]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Cidade
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={fieldClass("address.city")}
            />
            {errors["address.city"] && (
              <p className="mt-1 text-xs text-red-600">{errors["address.city"]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Estado (UF)
            </label>
            <input
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              maxLength={2}
              className={fieldClass("address.state")}
            />
            {errors["address.state"] && (
              <p className="mt-1 text-xs text-red-600">{errors["address.state"]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Brand colors */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Palette className="h-4 w-4 text-violet-600" />
          <h2 className="font-bold text-neutral-900">Identidade visual</h2>
        </div>
        <div className="max-w-md">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Cor principal
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
              className="h-11 w-11 cursor-pointer rounded-xl border border-neutral-200"
            />
            <input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
              className={`${fieldClass("primaryColor")} font-mono`}
            />
          </div>
          {errors.primaryColor && (
            <p className="mt-1 text-xs text-red-600">{errors.primaryColor}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
