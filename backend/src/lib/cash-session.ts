import { prisma } from "./prisma.js";
import { todayDateOnly } from "./format.js";
import { ApiError } from "../middleware/auth.js";

export async function getCashSessionStatus(date = todayDateOnly()) {
  const [opened, closed] = await Promise.all([
    prisma.cashOpen.findUnique({
      where: { openDate: date },
      include: { openedBy: { select: { name: true } } },
    }),
    prisma.cashClose.findUnique({
      where: { closeDate: date },
      include: { closedBy: { select: { name: true } } },
    }),
  ]);

  const canTakeOrders = !!opened && !closed;
  let blockReason: string | null = null;
  if (!opened) {
    blockReason = "Debe abrir caja antes de tomar pedidos";
  } else if (closed) {
    blockReason = "La caja ya fue cerrada con el corte del día. No se pueden tomar más pedidos.";
  }

  return {
    date: date.toISOString().slice(0, 10),
    opened,
    closed,
    canTakeOrders,
    blockReason,
  };
}

export async function assertCanTakeOrders(date = todayDateOnly()) {
  const status = await getCashSessionStatus(date);
  if (!status.canTakeOrders) {
    throw new ApiError(status.blockReason ?? "No se pueden tomar pedidos", 403);
  }
}

export async function getCashDailySummary(date = todayDateOnly()) {
  const orders = await prisma.order.findMany({
    where: { orderDate: date },
    select: {
      paidAt: true,
      status: true,
      totalMxn: true,
      totalUsd: true,
    },
  });

  const paidOrders = orders.filter((order) => order.paidAt);
  const pendingOrders = orders.filter(
    (order) => !order.paidAt && order.status !== "CANCELLED",
  );

  let totalCobradoMxn = 0;
  let totalCobradoUsd = 0;
  for (const order of paidOrders) {
    totalCobradoMxn += Number(order.totalMxn.toString());
    totalCobradoUsd += Number(order.totalUsd.toString());
  }

  return {
    date: date.toISOString().slice(0, 10),
    totalCobradoMxn: Math.round(totalCobradoMxn * 100) / 100,
    totalCobradoUsd: Math.round(totalCobradoUsd * 100) / 100,
    pedidosDespachados: paidOrders.length,
    pedidosPendientes: pendingOrders.length,
  };
}

type PaymentLike = {
  method: string;
  currency: string;
  amount: { toString(): string };
};

type PaidOrderLike = {
  totalMxn: { toString(): string };
  totalUsd: { toString(): string };
  payments: PaymentLike[];
};

export function buildCashCloseSummary(
  paidOrders: PaidOrderLike[],
  cancelledCount: number,
) {
  const summary = {
    totalCashMxn: 0,
    totalCardMxn: 0,
    totalCashUsd: 0,
    totalCardUsd: 0,
    totalVentasMxn: 0,
    totalVentasUsd: 0,
    orderCount: paidOrders.length,
    cancelledCount,
  };

  for (const order of paidOrders) {
    summary.totalVentasMxn += Number(order.totalMxn.toString());
    summary.totalVentasUsd += Number(order.totalUsd.toString());
    for (const payment of order.payments) {
      const amount = Number(payment.amount.toString());
      if (payment.method === "CASH" && payment.currency === "MXN") {
        summary.totalCashMxn += amount;
      }
      if (payment.method === "CARD" && payment.currency === "MXN") {
        summary.totalCardMxn += amount;
      }
      if (payment.method === "CASH" && payment.currency === "USD") {
        summary.totalCashUsd += amount;
      }
      if (payment.method === "CARD" && payment.currency === "USD") {
        summary.totalCardUsd += amount;
      }
    }
  }

  summary.totalCashMxn = Math.round(summary.totalCashMxn * 100) / 100;
  summary.totalCardMxn = Math.round(summary.totalCardMxn * 100) / 100;
  summary.totalCashUsd = Math.round(summary.totalCashUsd * 100) / 100;
  summary.totalCardUsd = Math.round(summary.totalCardUsd * 100) / 100;
  summary.totalVentasMxn = Math.round(summary.totalVentasMxn * 100) / 100;
  summary.totalVentasUsd = Math.round(summary.totalVentasUsd * 100) / 100;

  return summary;
}

type OrderCloseCheck = {
  id: string;
  dailyNumber: number;
  customerName: string;
  paidAt: Date | null;
  status: string;
};

export function getCashCloseReadiness(orders: OrderCloseCheck[]) {
  const pendingPaymentOrders = orders.filter(
    (order) => !order.paidAt && order.status !== "CANCELLED",
  );
  const pendingKitchenOrders = orders.filter(
    (order) =>
      order.paidAt &&
      order.status !== "CANCELLED" &&
      order.status !== "DELIVERED",
  );

  const reasons: string[] = [];
  if (pendingPaymentOrders.length > 0) {
    reasons.push(
      `${pendingPaymentOrders.length} pedido(s) pendiente(s) de cobro`,
    );
  }
  if (pendingKitchenOrders.length > 0) {
    reasons.push(
      `${pendingKitchenOrders.length} pedido(s) en cocina pendiente(s) de entregar`,
    );
  }

  return {
    canClose: reasons.length === 0,
    blockReason:
      reasons.length > 0
        ? `No se puede cerrar el corte: ${reasons.join(" y ")}`
        : null,
    pendingPaymentCount: pendingPaymentOrders.length,
    pendingKitchenCount: pendingKitchenOrders.length,
    pendingPaymentOrders,
    pendingKitchenOrders,
  };
}

export async function assertCanCloseCash(date = todayDateOnly()) {
  const orders = await prisma.order.findMany({
    where: { orderDate: date },
    select: {
      id: true,
      dailyNumber: true,
      customerName: true,
      paidAt: true,
      status: true,
    },
  });
  const readiness = getCashCloseReadiness(orders);
  if (!readiness.canClose) {
    throw new ApiError(readiness.blockReason ?? "No se puede cerrar el corte", 400);
  }
}
