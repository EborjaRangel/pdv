"use client";

import { useEffect, useState } from "react";
import { PageButton, PageHeader } from "@/components/PageHeader";
import { apiFetch } from "@/lib/api-client";
import { formatMxn, formatOrderNumber } from "@/lib/format";

type Order = {
  id: string;
  dailyNumber: number;
  customerName: string;
  customerPhone: string | null;
  status: string;
  totalMxn: string;
  paidAt: string | null;
  items: Array<{
    dishName: string;
    quantity: number;
  }>;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  PREPARING: "Preparando",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const nextStatus: Record<string, string> = {
  PENDING: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
};

export default function CocinaPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function loadOrders() {
    const response = await apiFetch("/api/orders");
    const data = await response.json();
    const active = data.filter(
      (order: Order) =>
        order.paidAt &&
        ["PREPARING", "READY"].includes(order.status),
    );
    setOrders(active);
  }

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  async function updateStatus(orderId: string, status: string) {
    await apiFetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadOrders();
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="Cocina"
        action={<PageButton onClick={loadOrders}>Actualizar</PageButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => (
          <article key={order.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-bold text-orange-700">
                  {formatOrderNumber(order.dailyNumber)}
                </p>
                <p className="font-medium">{order.customerName}</p>
                {order.customerPhone ? (
                  <p className="text-sm text-zinc-500">{order.customerPhone}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium">
                {statusLabels[order.status] ?? order.status}
              </span>
            </div>

            <ul className="mt-4 space-y-2">
              {order.items.map((item, index) => (
                <li key={`${order.id}-${index}`} className="rounded-xl bg-zinc-50 p-3">
                  <p className="font-medium">
                    {item.quantity}x {item.dishName}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <strong className="text-base">{formatMxn(Number(order.totalMxn))}</strong>
              {nextStatus[order.status] ? (
                <button
                  type="button"
                  onClick={() => updateStatus(order.id, nextStatus[order.status])}
                  className="touch-target w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-medium text-white sm:w-auto"
                >
                  Marcar {statusLabels[nextStatus[order.status]]}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 text-center text-zinc-500">No hay pedidos activos</p>
      ) : null}
    </div>
  );
}
