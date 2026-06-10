"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageButton, PageHeader } from "@/components/PageHeader";
import { apiFetch } from "@/lib/api-client";
import { formatMxn, formatOrderNumber, formatUsd } from "@/lib/format";

type Order = {
  id: string;
  dailyNumber: number;
  customerName: string;
  customerPhone: string | null;
  status: string;
  totalMxn: string;
  totalUsd: string;
  paidAt: string | null;
  items: Array<{
    dishName: string;
    quantity: number;
    priceMxn: string;
  }>;
};

type PaymentLine = {
  method: "CASH" | "CARD";
  currency: "MXN" | "USD";
  amount: string;
  cashReceived: string;
};

type CashSession = {
  canTakeOrders: boolean;
  blockReason: string | null;
  opened: { openedAt: string; openedBy: { name: string } } | null;
  closed: { closedAt: string; closedBy: { name: string } } | null;
};

type DailySummary = {
  totalCobradoMxn: number;
  totalCobradoUsd: number;
  pedidosDespachados: number;
  pedidosPendientes: number;
};

export default function CajaPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [exchangeRate, setExchangeRate] = useState(17.5);
  const [payments, setPayments] = useState<PaymentLine[]>([
    { method: "CASH", currency: "MXN", amount: "", cashReceived: "" },
  ]);
  const [cancelReason, setCancelReason] = useState("");
  const [message, setMessage] = useState("");
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [opening, setOpening] = useState(false);

  async function loadOrders() {
    const [ordersRes, settingsRes, sessionRes, summaryRes] = await Promise.all([
      apiFetch("/api/orders?unpaid=true"),
      apiFetch("/api/settings"),
      apiFetch("/api/cash-session"),
      apiFetch("/api/cash-daily-summary"),
    ]);
    const ordersData = await ordersRes.json();
    const settingsData = await settingsRes.json();
    const sessionData = await sessionRes.json();
    const summaryData = await summaryRes.json();
    setOrders(ordersData);
    if (settingsData?.exchangeRate) {
      setExchangeRate(Number(settingsData.exchangeRate));
    }
    if (sessionRes.ok) {
      setCashSession(sessionData);
    }
    if (summaryRes.ok) {
      setDailySummary(summaryData);
    }
  }

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const paidEquivalent = useMemo(() => {
    return payments.reduce((sum, payment) => {
      const amount = Number(payment.amount || 0);
      if (payment.currency === "USD") {
        return sum + amount * exchangeRate;
      }
      return sum + amount;
    }, 0);
  }, [payments, exchangeRate]);

  const cashChangePreview = useMemo(() => {
    return payments.map((payment) => {
      if (payment.method !== "CASH") return null;
      const amount = Number(payment.amount || 0);
      const received = Number(payment.cashReceived || 0);
      if (!received || received < amount) return null;
      return received - amount;
    });
  }, [payments]);

  function formatPaymentMoney(value: number, currency: "MXN" | "USD") {
    return currency === "MXN" ? formatMxn(value) : formatUsd(value);
  }

  function openPayment(order: Order) {
    setSelectedOrder(order);
    setPayments([
      {
        method: "CASH",
        currency: "MXN",
        amount: Number(order.totalMxn).toFixed(2),
        cashReceived: "",
      },
    ]);
    setMessage("");
  }

  function addPaymentLine() {
    setPayments((current) => [
      ...current,
      { method: "CARD", currency: "MXN", amount: "", cashReceived: "" },
    ]);
  }

  async function submitPayment() {
    if (!selectedOrder) return;

    setMessage("");

    for (const payment of payments.filter((p) => Number(p.amount) > 0)) {
      if (payment.method !== "CASH") continue;
      const amount = Number(payment.amount);
      const received = Number(payment.cashReceived);
      if (!received) {
        setMessage("Indica con cuánto paga el cliente en efectivo");
        return;
      }
      if (received < amount) {
        setMessage("El efectivo recibido debe ser mayor o igual al monto a pagar");
        return;
      }
    }

    const payload = payments
      .filter((payment) => Number(payment.amount) > 0)
      .map((payment) => ({
        method: payment.method,
        currency: payment.currency,
        amount: Number(payment.amount),
        ...(payment.method === "CASH"
          ? { cashReceived: Number(payment.cashReceived) }
          : {}),
      }));

    const response = await apiFetch(`/api/orders/${selectedOrder.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payments: payload }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cobrar");
      return;
    }

    setSelectedOrder(null);
    loadOrders();
    router.push(
      `/imprimir/${data.id}?auto=1`,
    );
  }

  async function cancelOrder(orderId: string) {
    if (!cancelReason.trim()) {
      setMessage("Indica el motivo de cancelación");
      return;
    }

    const response = await apiFetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason }),
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "No se pudo cancelar");
      return;
    }

    setCancelReason("");
    loadOrders();
  }

  async function openCashRegister() {
    setOpening(true);
    setMessage("");
    const response = await apiFetch("/api/cash-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    setOpening(false);
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo abrir caja");
      return;
    }
    loadOrders();
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="Caja"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pedidos"
              className="touch-target rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-800"
            >
              Tomar pedido
            </Link>
            <PageButton onClick={loadOrders}>Actualizar</PageButton>
          </div>
        }
      />

      {cashSession?.closed ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Corte del día realizado por {cashSession.closed.closedBy.name} el{" "}
          {new Date(cashSession.closed.closedAt).toLocaleString("es-MX")}. No se
          aceptan más pedidos hoy.
        </div>
      ) : cashSession?.opened ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Caja abierta por {cashSession.opened.openedBy.name} el{" "}
          {new Date(cashSession.opened.openedAt).toLocaleString("es-MX")}
        </div>
      ) : (
        <div className="card mb-4">
          <p className="font-semibold text-amber-900">Caja sin abrir</p>
          <p className="mt-1 text-sm text-amber-800">
            Abre caja para permitir que se tomen pedidos del día.
          </p>
          <button
            type="button"
            onClick={openCashRegister}
            disabled={opening}
            className="touch-target mt-3 w-full rounded-xl bg-orange-600 px-4 py-3.5 font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            {opening ? "Abriendo..." : "Abrir caja del día"}
          </button>
        </div>
      )}

      {message ? (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      {dailySummary ? (
        <div className="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-zinc-500">Cobrado hoy</p>
            <p className="text-xl font-bold text-orange-700">
              {formatMxn(dailySummary.totalCobradoMxn)}
            </p>
            <p className="text-sm text-zinc-600">
              {formatUsd(dailySummary.totalCobradoUsd)}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Pedidos despachados</p>
            <p className="text-xl font-bold text-orange-700">
              {dailySummary.pedidosDespachados}
            </p>
            <p className="text-sm text-zinc-600">
              {dailySummary.pedidosPendientes} pendiente
              {dailySummary.pedidosPendientes === 1 ? "" : "s"} de cobro
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-bold text-orange-700">
                  {formatOrderNumber(order.dailyNumber)}
                </p>
                <p className="font-medium">{order.customerName}</p>
                {order.customerPhone ? (
                  <p className="text-sm text-zinc-500">{order.customerPhone}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p>{formatMxn(Number(order.totalMxn))}</p>
                <p className="text-sm text-zinc-500">
                  {formatUsd(Number(order.totalUsd))}
                </p>
              </div>
            </div>

            <ul className="mt-3 space-y-1 text-sm text-zinc-600">
              {order.items.map((item, index) => (
                <li key={`${order.id}-${index}`}>
                  {item.quantity}x {item.dishName}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => openPayment(order)}
                className="touch-target w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-medium text-white sm:w-auto"
              >
                Cobrar
              </button>
              <button
                type="button"
                onClick={() => cancelOrder(order.id)}
                className="touch-target w-full rounded-xl border border-red-300 px-4 py-3 text-sm text-red-700 sm:w-auto"
              >
                Cancelar
              </button>
            </div>
          </article>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 text-center text-zinc-500">
          No hay pedidos pendientes de cobro
        </p>
      ) : null}

      <div className="card mt-8">
        <h2 className="font-semibold">Cancelación rápida</h2>
        <input
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Motivo de cancelación"
          className="input-touch mt-3"
        />
      </div>

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <div className="modal-sheet">
            <h2 className="text-xl font-bold">
              Cobrar {formatOrderNumber(selectedOrder.dailyNumber)}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Total: {formatMxn(Number(selectedOrder.totalMxn))} /{" "}
              {formatUsd(Number(selectedOrder.totalUsd))}
            </p>

            <div className="mt-4 space-y-3">
              {payments.map((payment, index) => (
                <div key={index} className="rounded-xl bg-zinc-50 p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <select
                      value={payment.method}
                      onChange={(e) =>
                        setPayments((current) =>
                          current.map((line, i) =>
                            i === index
                              ? {
                                  ...line,
                                  method: e.target.value as "CASH" | "CARD",
                                }
                              : line,
                          ),
                        )
                      }
                      className="input-touch"
                    >
                      <option value="CASH">Efectivo</option>
                      <option value="CARD">Tarjeta</option>
                    </select>
                    <select
                      value={payment.currency}
                      onChange={(e) =>
                        setPayments((current) =>
                          current.map((line, i) =>
                            i === index
                              ? {
                                  ...line,
                                  currency: e.target.value as "MXN" | "USD",
                                }
                              : line,
                          ),
                        )
                      }
                      className="input-touch"
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <input
                    value={payment.amount}
                    onChange={(e) =>
                      setPayments((current) =>
                        current.map((line, i) =>
                          i === index ? { ...line, amount: e.target.value } : line,
                        ),
                      )
                    }
                    placeholder="Monto a pagar"
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-touch mt-2"
                  />
                  {payment.method === "CASH" ? (
                    <>
                      <input
                        value={payment.cashReceived}
                        onChange={(e) =>
                          setPayments((current) =>
                            current.map((line, i) =>
                              i === index
                                ? { ...line, cashReceived: e.target.value }
                                : line,
                            ),
                          )
                        }
                        placeholder="Con cuánto paga"
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-touch mt-2"
                        required
                      />
                      {cashChangePreview[index] != null ? (
                        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                          Cambio:{" "}
                          {formatPaymentMoney(
                            cashChangePreview[index]!,
                            payment.currency,
                          )}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPaymentLine}
              className="mt-3 text-sm text-orange-700"
            >
              + Agregar forma de pago
            </button>

            <p className="mt-4 text-sm">
              Cubierto: {formatMxn(paidEquivalent)} /{" "}
              {formatMxn(Number(selectedOrder.totalMxn))}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="touch-target flex-1 rounded-xl border px-4 py-3.5"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={submitPayment}
                className="touch-target flex-1 rounded-xl bg-orange-600 px-4 py-3.5 text-base font-semibold text-white"
              >
                Confirmar cobro
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
