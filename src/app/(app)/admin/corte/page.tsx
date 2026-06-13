"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatMxn, formatOrderNumber, formatUsd } from "@/lib/format";

type Summary = {
  totalCashMxn: number;
  totalCardMxn: number;
  totalCashUsd: number;
  totalCardUsd: number;
  totalVentasMxn: number;
  totalVentasUsd: number;
  orderCount: number;
  cancelledCount: number;
};

type CashSessionInfo = {
  opened: { openedAt: string; openedBy: { name: string } } | null;
  canTakeOrders: boolean;
  blockReason: string | null;
};

type PendingOrderSummary = {
  id: string;
  dailyNumber: number;
  customerName: string;
};

type CloseReadiness = {
  canClose: boolean;
  blockReason: string | null;
  pendingPaymentCount: number;
  pendingKitchenCount: number;
  pendingPaymentOrders: PendingOrderSummary[];
  pendingKitchenOrders: PendingOrderSummary[];
};

function PendingOrdersAlert({
  title,
  orders,
}: {
  title: string;
  orders: PendingOrderSummary[];
}) {
  if (orders.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-semibold">{title} ({orders.length})</p>
      <ul className="mt-2 space-y-1">
        {orders.map((order) => (
          <li key={order.id}>
            {formatOrderNumber(order.dailyNumber)} · {order.customerName}
          </li>
        ))}
      </ul>
    </div>
  );
}

type OrderListItem = {
  id: string;
  dailyNumber: number;
  customerName: string;
  customerPhone: string | null;
  status: string;
  totalMxn: string;
  totalUsd: string;
  paidAt: string | null;
  cancelReason: string | null;
  paidBy: { name: string } | null;
  items: Array<{ dishName: string; quantity: number }>;
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  PREPARING: "Preparando",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

function OrderList({
  title,
  orders,
  variant,
}: {
  title: string;
  orders: OrderListItem[];
  variant: "paid" | "cancelled";
}) {
  if (orders.length === 0) {
    return (
      <section className="card mt-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-zinc-500">Sin pedidos</p>
      </section>
    );
  }

  return (
    <section className="card mt-4">
      <h2 className="font-semibold">
        {title}{" "}
        <span className="text-sm font-normal text-zinc-500">({orders.length})</span>
      </h2>
      <ul className="mt-3 space-y-3">
        {orders.map((order) => (
          <li
            key={order.id}
            className={`rounded-xl border p-3 ${
              variant === "cancelled"
                ? "border-red-200 bg-red-50/50"
                : "border-zinc-200 bg-zinc-50/50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-orange-700">
                  {formatOrderNumber(order.dailyNumber)}
                </p>
                <p className="font-medium">{order.customerName}</p>
                {order.customerPhone ? (
                  <p className="text-sm text-zinc-500">{order.customerPhone}</p>
                ) : null}
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{formatMxn(Number(order.totalMxn))}</p>
                <p className="text-zinc-500">{formatUsd(Number(order.totalUsd))}</p>
              </div>
            </div>

            <ul className="mt-2 space-y-0.5 text-sm text-zinc-600">
              {order.items.map((item, index) => (
                <li key={`${order.id}-${index}`}>
                  {item.quantity}x {item.dishName}
                </li>
              ))}
            </ul>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span>Estado: {statusLabels[order.status] ?? order.status}</span>
              {order.paidAt ? (
                <span>
                  Cobrado:{" "}
                  {new Date(order.paidAt).toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {order.paidBy ? ` · ${order.paidBy.name}` : ""}
                </span>
              ) : null}
              {order.cancelReason ? (
                <span className="text-red-700">Motivo: {order.cancelReason}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CorteAdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [paidOrders, setPaidOrders] = useState<OrderListItem[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<OrderListItem[]>([]);
  const [closed, setClosed] = useState<{ closedAt: string; closedBy: { name: string } } | null>(
    null,
  );
  const [sessionInfo, setSessionInfo] = useState<CashSessionInfo | null>(null);
  const [closeReadiness, setCloseReadiness] = useState<CloseReadiness | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await apiFetch("/api/cash-close");
    const data = await response.json();
    setSummary(data.summary);
    setPaidOrders(data.paidOrders ?? []);
    setCancelledOrders(data.cancelledOrders ?? []);
    setClosed(data.closed);
    setCloseReadiness(data.closeReadiness ?? null);
    setSessionInfo({
      opened: data.opened,
      canTakeOrders: data.canTakeOrders,
      blockReason: data.blockReason,
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function closeDay() {
    const response = await apiFetch("/api/cash-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Corte registrado" : data.error ?? "Error");
    load();
  }

  if (!summary) return <p>Cargando...</p>;

  return (
    <div className="w-full min-w-0 max-w-3xl">
      <h1 className="page-title">Corte de caja</h1>

      {!sessionInfo?.opened && !closed ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          La caja aún no está abierta. Debe abrirse desde Caja antes de tomar
          pedidos o realizar el corte.
        </p>
      ) : null}

      <div className="card mt-4 border-orange-200 bg-orange-50/40">
        <p className="text-sm font-medium uppercase tracking-wide text-orange-800">
          Total venta del día
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-3xl font-bold text-orange-700">
            {formatMxn(summary.totalVentasMxn)}
          </p>
          <p className="text-xl font-semibold text-zinc-700">
            {formatUsd(summary.totalVentasUsd)}
          </p>
        </div>

        <div className="mt-4 border-t border-orange-200/80 pt-4">
          <p className="text-sm font-semibold text-zinc-800">Cobrado por forma de pago</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex justify-between rounded-lg bg-white/80 px-3 py-2 text-sm">
              <span>Efectivo MXN</span>
              <strong>{formatMxn(summary.totalCashMxn)}</strong>
            </div>
            <div className="flex justify-between rounded-lg bg-white/80 px-3 py-2 text-sm">
              <span>Tarjeta MXN</span>
              <strong>{formatMxn(summary.totalCardMxn)}</strong>
            </div>
            <div className="flex justify-between rounded-lg bg-white/80 px-3 py-2 text-sm">
              <span>Efectivo USD</span>
              <strong>{formatUsd(summary.totalCashUsd)}</strong>
            </div>
            <div className="flex justify-between rounded-lg bg-white/80 px-3 py-2 text-sm">
              <span>Tarjeta USD</span>
              <strong>{formatUsd(summary.totalCardUsd)}</strong>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-orange-200/80 pt-3 text-sm text-zinc-600">
          <span>Pedidos cobrados: {summary.orderCount}</span>
          <span>Cancelados: {summary.cancelledCount}</span>
        </div>
      </div>

      <OrderList
        title="Pedidos cobrados y despachados"
        orders={paidOrders}
        variant="paid"
      />

      <OrderList title="Pedidos cancelados" orders={cancelledOrders} variant="cancelled" />

      {closed ? (
        <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          Corte cerrado por {closed.closedBy.name} el{" "}
          {new Date(closed.closedAt).toLocaleString("es-MX")}. No se pueden tomar
          más pedidos mientras la caja siga cerrada. Para volver a operar hoy, usa{" "}
          <strong>Reabrir caja del día</strong> en Caja. Al día siguiente, usa{" "}
          <strong>Abrir caja del día</strong>.
        </p>
      ) : (
        <div className="card mt-4">
          {closeReadiness && !closeReadiness.canClose ? (
            <div className="mb-4 space-y-3">
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                {closeReadiness.blockReason}
              </p>
              <PendingOrdersAlert
                title="Pendientes de cobro"
                orders={closeReadiness.pendingPaymentOrders}
              />
              <PendingOrdersAlert
                title="Pendientes de entregar en cocina"
                orders={closeReadiness.pendingKitchenOrders}
              />
            </div>
          ) : null}
          <p className="mb-3 text-sm text-zinc-600">
            Al cerrar el corte del día ya no se podrán registrar pedidos hasta
            abrir caja mañana.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas del corte"
            className="input-touch min-h-[5rem] resize-y"
            rows={3}
          />
          <button
            type="button"
            onClick={closeDay}
            disabled={!sessionInfo?.opened || closeReadiness?.canClose === false}
            className="touch-target mt-3 w-full rounded-xl bg-orange-600 px-4 py-3.5 font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            Cerrar corte del día
          </button>
        </div>
      )}

      {message ? <p className="mt-3 text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
