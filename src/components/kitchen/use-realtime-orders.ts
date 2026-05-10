"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type RealtimeStatus = "disabled" | "connecting" | "connected" | "error";

/**
 * Subscribes to realtime changes on the `orders` table for a given restaurant.
 * Falls back gracefully (status="disabled") when Supabase is not configured.
 */
export function useRealtimeOrders(restaurantId: string | null): RealtimeStatus {
  const router = useRouter();
  const [status, setStatus] = useState<RealtimeStatus>("disabled");

  useEffect(() => {
    if (!restaurantId) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      setStatus("disabled");
      return;
    }

    setStatus("connecting");

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      const { createBrowserClient } = await import("@supabase/ssr");
      if (cancelled) return;
      const supabase = createBrowserClient(url, anon);

      const channel = supabase
        .channel(`orders-${restaurantId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => {
            router.refresh();
          },
        )
        .subscribe((subStatus) => {
          if (cancelled) return;
          if (subStatus === "SUBSCRIBED") setStatus("connected");
          else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT")
            setStatus("error");
        });

      unsubscribe = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [restaurantId, router]);

  return status;
}
