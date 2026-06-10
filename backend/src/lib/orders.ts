import { prisma } from "./prisma.js";
import { todayDateOnly, toNumber } from "./format.js";
import type { BusinessSettings } from "../generated/prisma/client.js";

export function usdFromMxn(mxn: number, exchangeRate: number) {
  return Math.round((mxn / exchangeRate) * 100) / 100;
}

export function mxnFromUsd(usd: number, exchangeRate: number) {
  return Math.round(usd * exchangeRate * 100) / 100;
}

export function dishUsdPrice(
  priceMxn: number,
  priceUsd: number | null | undefined,
  exchangeRate: number,
) {
  if (priceUsd != null) return priceUsd;
  return usdFromMxn(priceMxn, exchangeRate);
}

export async function getSettings() {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
  });
  if (settings) return settings;
  return prisma.businessSettings.create({ data: { id: "default" } });
}

export async function nextDailyOrderNumber(date = todayDateOnly()) {
  return prisma.$transaction(async (tx) => {
    const counter = await tx.dailyOrderCounter.upsert({
      where: { date },
      create: { date, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return counter.lastNumber;
  });
}

export function calculateTotals(
  items: Array<{ priceMxn: number; priceUsd: number; quantity: number }>,
) {
  const subtotalMxn = items.reduce(
    (sum, item) => sum + item.priceMxn * item.quantity,
    0,
  );
  const totalUsd = items.reduce(
    (sum, item) => sum + item.priceUsd * item.quantity,
    0,
  );
  return {
    subtotalMxn: Math.round(subtotalMxn * 100) / 100,
    totalMxn: Math.round(subtotalMxn * 100) / 100,
    totalUsd: Math.round(totalUsd * 100) / 100,
  };
}

export function getExchangeRate(settings: BusinessSettings) {
  return toNumber(settings.exchangeRate);
}
