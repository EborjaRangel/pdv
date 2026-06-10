import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken, verifyPassword } from "../lib/auth.js";
import {
  calculateTotals,
  dishUsdPrice,
  getExchangeRate,
  getSettings,
  mxnFromUsd,
  nextDailyOrderNumber,
} from "../lib/orders.js";
import { assertCanTakeOrders, assertCanCloseCash, buildCashCloseSummary, getCashDailySummary, getCashCloseReadiness, getCashSessionStatus } from "../lib/cash-session.js";
import { todayDateOnly, toNumber } from "../lib/format.js";
import { ApiError, handleError, requireAuth, requireRoles } from "../middleware/auth.js";

const router = Router();
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.post("/auth/login", async (req, res) => {
  try {
    const body = z
      .object({ email: z.email(), password: z.string().min(1) })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.active) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = await signToken(sessionUser);
    res.json({ user: sessionUser, token });
  } catch (error) {
    handleError(error, res);
  }
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get("/categories", requireAuth, async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { dishes: true } } },
    });
    res.json(categories);
  } catch (error) {
    handleError(error, res);
  }
});

router.post(
  "/categories",
  requireAuth,
  requireRoles("ADMIN"),
  async (req, res) => {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          sortOrder: z.number().int().optional(),
          active: z.boolean().optional(),
        })
        .parse(req.body);
      const category = await prisma.category.create({
        data: {
          name: body.name,
          sortOrder: body.sortOrder ?? 0,
          active: body.active ?? true,
        },
      });
      res.status(201).json(category);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.patch(
  "/categories/:id",
  requireAuth,
  requireRoles("ADMIN"),
  async (req, res) => {
    try {
      const body = z
        .object({
          name: z.string().min(1).optional(),
          sortOrder: z.number().int().optional(),
          active: z.boolean().optional(),
        })
        .parse(req.body);
      const category = await prisma.category.update({
        where: { id: paramId(req.params.id) },
        data: body,
      });
      res.json(category);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.delete(
  "/categories/:id",
  requireAuth,
  requireRoles("ADMIN"),
  async (req, res) => {
    try {
      const category = await prisma.category.update({
        where: { id: paramId(req.params.id) },
        data: { active: false },
      });
      res.json(category);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.get("/dishes", requireAuth, async (req, res) => {
  try {
    const activeOnly = req.query.active === "true";
    const dishes = await prisma.dish.findMany({
      where: activeOnly ? { active: true, category: { active: true } } : undefined,
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    });
    res.json(dishes);
  } catch (error) {
    handleError(error, res);
  }
});

router.post("/dishes", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  try {
    const body = z
      .object({
        name: z.string().min(1),
        priceMxn: z.number().positive(),
        priceUsd: z.number().positive().optional().nullable(),
        categoryId: z.string().min(1),
        imageUrl: z.string().optional().nullable(),
        active: z.boolean().optional(),
      })
      .parse(req.body);
    const dish = await prisma.dish.create({
      data: {
        name: body.name,
        priceMxn: body.priceMxn,
        priceUsd: body.priceUsd ?? null,
        categoryId: body.categoryId,
        imageUrl: body.imageUrl ?? null,
        active: body.active ?? true,
      },
      include: { category: true },
    });
    res.status(201).json(dish);
  } catch (error) {
    handleError(error, res);
  }
});

router.patch(
  "/dishes/:id",
  requireAuth,
  requireRoles("ADMIN"),
  async (req, res) => {
    try {
      const body = z
        .object({
          name: z.string().min(1).optional(),
          priceMxn: z.number().positive().optional(),
          priceUsd: z.number().positive().optional().nullable(),
          categoryId: z.string().min(1).optional(),
          imageUrl: z.string().optional().nullable(),
          active: z.boolean().optional(),
        })
        .parse(req.body);
      const dish = await prisma.dish.update({
        where: { id: paramId(req.params.id) },
        data: body,
        include: { category: true },
      });
      res.json(dish);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.delete(
  "/dishes/:id",
  requireAuth,
  requireRoles("ADMIN"),
  async (req, res) => {
    try {
      const dish = await prisma.dish.update({
        where: { id: paramId(req.params.id) },
        data: { active: false },
      });
      res.json(dish);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.get("/orders", requireAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const date = req.query.date as string | undefined;
    const unpaid = req.query.unpaid === "true";
    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(date ? { orderDate: new Date(`${date}T00:00:00.000Z`) } : {}),
        ...(unpaid ? { paidAt: null, status: { not: "CANCELLED" } } : {}),
      },
      include: {
        items: true,
        payments: true,
        createdBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
      },
      orderBy: [{ orderDate: "desc" }, { dailyNumber: "desc" }],
    });
    res.json(orders);
  } catch (error) {
    handleError(error, res);
  }
});

router.post(
  "/orders",
  requireAuth,
  requireRoles("ADMIN", "MESERO", "CAJERO"),
  async (req, res) => {
    try {
      await assertCanTakeOrders();

      const body = z
        .object({
          customerName: z.string().min(1),
          customerPhone: z.string().optional().nullable(),
          items: z
            .array(
              z.object({
                dishId: z.string().min(1),
                quantity: z.number().int().positive(),
              }),
            )
            .min(1),
        })
        .parse(req.body);

      const settings = await getSettings();
      const exchangeRate = getExchangeRate(settings);
      const orderDate = todayDateOnly();
      const dishIds = body.items.map((item) => item.dishId);
      const dishes = await prisma.dish.findMany({
        where: { id: { in: dishIds }, active: true },
      });
      if (dishes.length !== new Set(dishIds).size) {
        throw new ApiError("Platillo no válido", 400);
      }

      const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));
      const lineItems = body.items.map((item) => {
        const dish = dishMap.get(item.dishId)!;
        const priceMxn = toNumber(dish.priceMxn);
        const priceUsd = dishUsdPrice(
          priceMxn,
          dish.priceUsd ? toNumber(dish.priceUsd) : null,
          exchangeRate,
        );
        return {
          dishId: dish.id,
          dishName: dish.name,
          priceMxn,
          priceUsd,
          quantity: item.quantity,
        };
      });

      const totals = calculateTotals(lineItems);
      const dailyNumber = await nextDailyOrderNumber(orderDate);
      const order = await prisma.order.create({
        data: {
          dailyNumber,
          orderDate,
          customerName: body.customerName,
          customerPhone: body.customerPhone ?? null,
          subtotalMxn: totals.subtotalMxn,
          totalMxn: totals.totalMxn,
          totalUsd: totals.totalUsd,
          createdById: req.user!.id,
          items: { create: lineItems },
        },
        include: {
          items: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
      res.status(201).json(order);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: paramId(req.params.id) },
      include: {
        items: true,
        payments: true,
        createdBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
      },
    });
    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    const settings = await getSettings();
    res.json({ order, settings });
  } catch (error) {
    handleError(error, res);
  }
});

router.post(
  "/orders/:id/pay",
  requireAuth,
  requireRoles("ADMIN", "CAJERO"),
  async (req, res) => {
    try {
      const body = z
        .object({
          payments: z
            .array(
              z.object({
                method: z.enum(["CASH", "CARD"]),
                currency: z.enum(["MXN", "USD"]),
                amount: z.number().positive(),
                cashReceived: z.number().positive().optional(),
              }),
            )
            .min(1),
        })
        .parse(req.body);

      const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
      if (!order) throw new ApiError("Pedido no encontrado", 404);
      if (order.status === "CANCELLED") throw new ApiError("Pedido cancelado", 400);
      if (order.paidAt) throw new ApiError("Pedido ya pagado", 400);

      const paidTotalMxn = body.payments
        .filter((p) => p.currency === "MXN")
        .reduce((sum, p) => sum + p.amount, 0);
      const paidTotalUsd = body.payments
        .filter((p) => p.currency === "USD")
        .reduce((sum, p) => sum + p.amount, 0);

      const settings = await getSettings();
      const exchangeRate = getExchangeRate(settings);
      const paidEquivalentMxn =
        Math.round((paidTotalMxn + mxnFromUsd(paidTotalUsd, exchangeRate)) * 100) /
        100;

      if (paidEquivalentMxn < toNumber(order.totalMxn)) {
        throw new ApiError("El pago no cubre el total del pedido", 400);
      }

      for (const payment of body.payments) {
        if (payment.method !== "CASH") continue;
        if (payment.cashReceived == null) {
          throw new ApiError("Indica con cuánto paga en efectivo", 400);
        }
        if (payment.cashReceived < payment.amount) {
          throw new ApiError("El efectivo recibido es menor al monto a pagar", 400);
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.payment.createMany({
          data: body.payments.map((payment) => ({
            orderId: paramId(req.params.id),
            method: payment.method,
            currency: payment.currency,
            amount: payment.amount,
            cashReceived: payment.cashReceived ?? null,
            changeGiven:
              payment.method === "CASH" && payment.cashReceived
                ? Math.round((payment.cashReceived - payment.amount) * 100) / 100
                : null,
          })),
        });
        return tx.order.update({
          where: { id: paramId(req.params.id) },
          data: {
            paidAt: new Date(),
            paidById: req.user!.id,
            status: order.status === "PENDING" ? "PREPARING" : order.status,
          },
          include: {
            items: true,
            payments: true,
            createdBy: { select: { id: true, name: true } },
            paidBy: { select: { id: true, name: true } },
          },
        });
      });
      res.json(updated);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.post(
  "/orders/:id/cancel",
  requireAuth,
  requireRoles("ADMIN", "CAJERO"),
  async (req, res) => {
    try {
      const body = z.object({ reason: z.string().min(1) }).parse(req.body);
      const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
      if (!order) throw new ApiError("Pedido no encontrado", 404);
      if (order.status === "CANCELLED") throw new ApiError("Pedido ya cancelado", 400);
      const updated = await prisma.order.update({
        where: { id: paramId(req.params.id) },
        data: {
          status: "CANCELLED",
          cancelReason: body.reason,
          cancelledAt: new Date(),
        },
        include: { items: true, payments: true },
      });
      res.json(updated);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.patch(
  "/orders/:id/status",
  requireAuth,
  requireRoles("ADMIN", "COCINA", "CAJERO"),
  async (req, res) => {
    try {
      const body = z
        .object({
          status: z.enum(["PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"]),
        })
        .parse(req.body);
      const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
      if (!order) throw new ApiError("Pedido no encontrado", 404);
      const updated = await prisma.order.update({
        where: { id: paramId(req.params.id) },
        data: { status: body.status },
        include: {
          items: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
      res.json(updated);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.get("/settings", requireAuth, async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    handleError(error, res);
  }
});

router.patch(
  "/settings",
  requireAuth,
  requireRoles("ADMIN"),
  async (req, res) => {
    try {
      const body = z
        .object({
          restaurantName: z.string().trim().min(1, "Nombre del restaurante requerido"),
          rfc: z
            .string()
            .trim()
            .min(1, "RFC requerido")
            .max(13, "RFC inválido")
            .transform((value) => value.toUpperCase()),
        })
        .parse(req.body);
      const settings = await prisma.businessSettings.upsert({
        where: { id: "default" },
        create: { id: "default", ...body },
        update: body,
      });
      res.json(settings);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.get("/users", requireAuth, requireRoles("ADMIN"), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    handleError(error, res);
  }
});

router.post("/users", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  try {
    const body = z
      .object({
        email: z.email(),
        name: z.string().min(1),
        password: z.string().min(6),
        role: z.enum(["ADMIN", "CAJERO", "MESERO", "COCINA"]),
      })
      .parse(req.body);
    const { hashPassword } = await import("../lib/auth.js");
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
        passwordHash: await hashPassword(body.password),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    handleError(error, res);
  }
});

router.patch(
  "/users/:id",
  requireAuth,
  requireRoles("ADMIN"),
  async (req, res) => {
    try {
      const body = z
        .object({
          name: z.string().min(1).optional(),
          role: z.enum(["ADMIN", "CAJERO", "MESERO", "COCINA"]).optional(),
          active: z.boolean().optional(),
          password: z.string().min(6).optional(),
        })
        .parse(req.body);
      const { hashPassword } = await import("../lib/auth.js");
      const user = await prisma.user.update({
        where: { id: paramId(req.params.id) },
        data: {
          name: body.name,
          role: body.role,
          active: body.active,
          ...(body.password
            ? { passwordHash: await hashPassword(body.password) }
            : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });
      res.json(user);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.get("/cash-session", requireAuth, async (_req, res) => {
  try {
    const session = await getCashSessionStatus();
    res.json(session);
  } catch (error) {
    handleError(error, res);
  }
});

router.get(
  "/cash-daily-summary",
  requireAuth,
  requireRoles("ADMIN", "CAJERO"),
  async (_req, res) => {
    try {
      const summary = await getCashDailySummary();
      res.json(summary);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.post(
  "/cash-open",
  requireAuth,
  requireRoles("ADMIN", "CAJERO"),
  async (req, res) => {
    try {
      const body = z
        .object({ notes: z.string().optional().nullable() })
        .parse(req.body);
      const openDate = todayDateOnly();

      const existingClose = await prisma.cashClose.findUnique({
        where: { closeDate: openDate },
      });
      if (existingClose) {
        throw new ApiError("Ya se realizó el corte del día. No se puede abrir caja.", 400);
      }

      const existingOpen = await prisma.cashOpen.findUnique({
        where: { openDate },
        include: { openedBy: { select: { name: true } } },
      });
      if (existingOpen) {
        return res.json(existingOpen);
      }

      const cashOpen = await prisma.cashOpen.create({
        data: {
          openDate,
          notes: body.notes ?? null,
          openedById: req.user!.id,
        },
        include: { openedBy: { select: { name: true } } },
      });
      res.status(201).json(cashOpen);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.get(
  "/cash-close",
  requireAuth,
  requireRoles("ADMIN", "CAJERO"),
  async (req, res) => {
    try {
      const dateParam = req.query.date as string | undefined;
      const closeDate = dateParam
        ? new Date(`${dateParam}T00:00:00.000Z`)
        : todayDateOnly();
      const existingClose = await prisma.cashClose.findUnique({
        where: { closeDate },
        include: { closedBy: { select: { name: true } } },
      });
      const session = await getCashSessionStatus(closeDate);
      const orders = await prisma.order.findMany({
        where: { orderDate: closeDate },
        include: {
          payments: true,
          items: { select: { dishName: true, quantity: true } },
          paidBy: { select: { name: true } },
        },
        orderBy: { dailyNumber: "asc" },
      });
      const paidOrders = orders.filter((order) => order.paidAt);
      const cancelledOrders = orders.filter((order) => order.status === "CANCELLED");
      const summary = buildCashCloseSummary(paidOrders, cancelledOrders.length);
      const closeReadiness = getCashCloseReadiness(orders);
      res.json({
        closeDate: closeDate.toISOString().slice(0, 10),
        closed: existingClose,
        opened: session.opened,
        canTakeOrders: session.canTakeOrders,
        blockReason: session.blockReason,
        closeReadiness,
        summary,
        paidOrders,
        cancelledOrders,
        orders,
      });
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.post(
  "/cash-close",
  requireAuth,
  requireRoles("ADMIN", "CAJERO"),
  async (req, res) => {
    try {
      const body = z
        .object({ notes: z.string().optional().nullable(), date: z.string().optional() })
        .parse(req.body);
      const closeDate = body.date
        ? new Date(`${body.date}T00:00:00.000Z`)
        : todayDateOnly();
      const existing = await prisma.cashClose.findUnique({ where: { closeDate } });
      if (existing) throw new ApiError("Ya existe corte para esta fecha", 400);

      const cashOpen = await prisma.cashOpen.findUnique({ where: { openDate: closeDate } });
      if (!cashOpen) {
        throw new ApiError("Debe abrir caja antes de realizar el corte", 400);
      }

      await assertCanCloseCash(closeDate);

      const orders = await prisma.order.findMany({
        where: { orderDate: closeDate },
        include: { payments: true },
      });
      const paidOrders = orders.filter((order) => order.paidAt);
      const cancelledOrders = orders.filter((order) => order.status === "CANCELLED");
      const summary = buildCashCloseSummary(paidOrders, cancelledOrders.length);

      const cashClose = await prisma.cashClose.create({
        data: {
          closeDate,
          totalCashMxn: summary.totalCashMxn,
          totalCardMxn: summary.totalCardMxn,
          totalCashUsd: summary.totalCashUsd,
          totalCardUsd: summary.totalCardUsd,
          orderCount: summary.orderCount,
          cancelledCount: summary.cancelledCount,
          notes: body.notes ?? null,
          closedById: req.user!.id,
        },
        include: { closedBy: { select: { name: true } } },
      });
      res.status(201).json(cashClose);
    } catch (error) {
      handleError(error, res);
    }
  },
);

router.post(
  "/upload",
  requireAuth,
  requireRoles("ADMIN"),
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Archivo requerido" });
    }
    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `${Date.now()}${ext}`;
    const target = path.join(uploadDir, filename);
    fs.renameSync(req.file.path, target);
    const baseUrl = process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
    res.json({ url: `${baseUrl}/uploads/${filename}` });
  },
);

export default router;
