import Image from "next/image";
import { Clock, MapPin, Phone } from "lucide-react";
import type { Restaurant } from "@/lib/db/schema";
import { isOpenNow, formatPhone } from "@/lib/utils";

export function RestaurantHeader({ restaurant }: { restaurant: Restaurant }) {
  const status = isOpenNow(
    restaurant.businessHours as Record<string, { open: string; close: string; closed?: boolean }>,
  );
  const addr = restaurant.address;

  return (
    <header className="relative">
      {restaurant.coverUrl ? (
        <div className="relative h-44 w-full overflow-hidden bg-neutral-200 sm:h-60">
          <Image
            src={restaurant.coverUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)]" />
      )}

      <div className="relative mx-auto -mt-12 max-w-3xl px-4 sm:-mt-14">
        <div className="flex items-end gap-4">
          {restaurant.logoUrl ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
              <Image
                src={restaurant.logoUrl}
                alt={restaurant.name}
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>
          ) : null}
          <div className="pb-2 text-white drop-shadow">
            <h1 className="text-2xl font-bold sm:text-3xl">{restaurant.name}</h1>
            <p className="text-sm opacity-90">
              {addr.neighborhood} · {addr.city}/{addr.state}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          {restaurant.description ? (
            <p className="text-sm text-neutral-700">{restaurant.description}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-600">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                status.open
                  ? "bg-green-100 text-green-700"
                  : "bg-neutral-200 text-neutral-700"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {status.open ? "Aberto agora" : "Fechado no momento"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-neutral-400" />
              {addr.street}, {addr.number}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-neutral-400" />
              {formatPhone(restaurant.phone)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
