"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { formatOrderNumber } from "@/lib/format";
import { TicketView } from "@/components/TicketView";

export default function ImprimirPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const auto = searchParams.get("auto") === "1";
  const [ticketType, setTicketType] = useState<"cliente" | "cocina">("cliente");
  const [printedKitchen, setPrintedKitchen] = useState(false);
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
  }, [auto, data, ticketType]);

  useEffect(() => {
    if (!auto) return;

    function handleAfterPrint() {
      if (ticketType === "cliente" && !printedKitchen) {
        setPrintedKitchen(true);
        setTicketType("cocina");
        return;
      }
    }

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [auto, ticketType, printedKitchen]);

  if (!data) {
    return <p className="p-4">Cargando ticket...</p>;
  }

  return (
    <div className="min-h-[100dvh] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTicketType("cliente")}
          className={`touch-target rounded-lg px-3 py-2.5 text-sm ${
            ticketType === "cliente" ? "bg-orange-600 text-white" : "border"
          }`}
        >
          Cliente
        </button>
        <button
          type="button"
          onClick={() => setTicketType("cocina")}
          className={`touch-target rounded-lg px-3 py-2.5 text-sm ${
            ticketType === "cocina" ? "bg-orange-600 text-white" : "border"
          }`}
        >
          Cocina
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Imprimir
        </button>
      </div>

      <TicketView
        order={data.order}
        settings={data.settings}
        type={ticketType}
      />
    </div>
  );
}
