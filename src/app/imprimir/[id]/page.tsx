"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { formatOrderNumber } from "@/lib/format";
import { TicketView } from "@/components/TicketView";

export default function ImprimirPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auto = searchParams.get("auto") === "1";
  const [data, setData] = useState<{
    order: Parameters<typeof TicketView>[0]["order"];
    settings: Parameters<typeof TicketView>[0]["settings"];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const response = await apiFetch(`/api/orders/${params.id}`);
      const json = await response.json();
      setData(json);
      if (json.order?.dailyNumber != null) {
        document.title = formatOrderNumber(json.order.dailyNumber);
      }
    }
    load();
  }, [params.id]);

  useEffect(() => {
    if (!auto || !data) return;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [auto, data]);

  if (!data) {
    return <p className="p-4">Cargando ticket...</p>;
  }

  return (
    <div className="min-h-[100dvh] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.push("/pedidos")}
          className="touch-target rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium"
        >
          Cliente
        </button>
        <button
          type="button"
          onClick={() => router.push("/cocina")}
          className="touch-target rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium"
        >
          Cocina
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="touch-target rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Imprimir / Guardar
        </button>
      </div>

      <TicketView order={data.order} settings={data.settings} type="cliente" />
    </div>
  );
}
