"use client";

import { Form, Formik } from "formik";
import { useEffect, useMemo, useState } from "react";
import { FormField } from "@/components/FormField";
import { apiFetch } from "@/lib/api-client";
import { formatMxn, formatUsd } from "@/lib/format";
import { orderCustomerSchema } from "@/lib/validations";

type Category = { id: string; name: string; active: boolean };
type Dish = {
  id: string;
  name: string;
  priceMxn: string;
  priceUsd: string | null;
  imageUrl: string | null;
  categoryId: string;
  category: { name: string };
};
type CartItem = {
  dishId: string;
  name: string;
  priceMxn: number;
  priceUsd: number;
  quantity: number;
};

type CashSession = {
  canTakeOrders: boolean;
  blockReason: string | null;
  opened: { openedAt: string; openedBy: { name: string } } | null;
  closed: { closedAt: string; closedBy: { name: string } } | null;
};

export default function PedidosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState(17.5);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [cashSession, setCashSession] = useState<CashSession | null>(null);

  useEffect(() => {
    async function load() {
      const [categoriesRes, dishesRes, settingsRes, sessionRes] = await Promise.all([
        apiFetch("/api/categories"),
        apiFetch("/api/dishes?active=true"),
        apiFetch("/api/settings"),
        apiFetch("/api/cash-session"),
      ]);
      const categoriesData = await categoriesRes.json();
      const dishesData = await dishesRes.json();
      const settingsData = await settingsRes.json();
      const sessionData = await sessionRes.json();
      setCategories(categoriesData.filter((c: Category) => c.active));
      setDishes(dishesData);
      if (settingsData?.exchangeRate) {
        setExchangeRate(Number(settingsData.exchangeRate));
      }
      if (sessionRes.ok) {
        setCashSession(sessionData);
      }
      setLoading(false);
    }
    load();
  }, []);

  const ordersBlocked = cashSession ? !cashSession.canTakeOrders : false;

  const filteredDishes = useMemo(() => {
    if (selectedCategory === "all") return dishes;
    return dishes.filter((dish) => dish.categoryId === selectedCategory);
  }, [dishes, selectedCategory]);

  const totals = useMemo(() => {
    const totalMxn = cart.reduce(
      (sum, item) => sum + item.priceMxn * item.quantity,
      0,
    );
    const totalUsd = cart.reduce(
      (sum, item) => sum + item.priceUsd * item.quantity,
      0,
    );
    return { totalMxn, totalUsd };
  }, [cart]);

  function addToCart(dish: Dish) {
    if (ordersBlocked) return;

    const priceMxn = Number(dish.priceMxn);
    const priceUsd = dish.priceUsd
      ? Number(dish.priceUsd)
      : Math.round((priceMxn / exchangeRate) * 100) / 100;

    setCart((current) => {
      const existing = current.find((item) => item.dishId === dish.id);
      if (existing) {
        return current.map((item) =>
          item.dishId === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...current,
        {
          dishId: dish.id,
          name: dish.name,
          priceMxn,
          priceUsd,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(dishId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.dishId !== dishId));
      return;
    }
    setCart((current) =>
      current.map((item) =>
        item.dishId === dishId ? { ...item, quantity } : item,
      ),
    );
  }

  if (loading) {
    return <p className="text-zinc-500">Cargando menú...</p>;
  }

  return (
    <Formik
      initialValues={{ customerName: "", customerPhone: "" }}
      validationSchema={orderCustomerSchema}
      onSubmit={async (values, { setSubmitting, resetForm }) => {
        setMessage("");
        setCartError("");

        if (ordersBlocked) {
          setCartError(cashSession?.blockReason ?? "No se pueden tomar pedidos");
          setSubmitting(false);
          return;
        }

        if (cart.length === 0) {
          setCartError("Agrega al menos un platillo");
          setSubmitting(false);
          return;
        }

        const response = await apiFetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: values.customerName.trim(),
            customerPhone: values.customerPhone?.trim() || null,
            items: cart.map((item) => ({
              dishId: item.dishId,
              quantity: item.quantity,
            })),
          }),
        });

        const data = await response.json();
        setSubmitting(false);

        if (!response.ok) {
          setCartError(data.error ?? "No se pudo crear el pedido");
          return;
        }

        setMessage(
          `Pedido ${String(data.dailyNumber).padStart(3, "0")} creado. Total: ${formatMxn(data.totalMxn)}`,
        );
        setCart([]);
        resetForm();
      }}
    >
      {({ isSubmitting }) => (
        <Form className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-start">
          {ordersBlocked ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 lg:col-span-2">
              <p className="font-semibold">Pedidos bloqueados</p>
              <p className="mt-1">{cashSession?.blockReason}</p>
              {!cashSession?.opened ? (
                <p className="mt-2 text-amber-800">
                  Un cajero o administrador debe abrir caja desde la pantalla de Caja.
                </p>
              ) : null}
            </div>
          ) : null}

          <section className="min-w-0">
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Nombre del cliente *"
                name="customerName"
                placeholder="Nombre del cliente"
              />
              <FormField
                label="Teléfono (opcional)"
                name="customerPhone"
                placeholder="Teléfono"
              />
            </div>

            <div className="scroll-x-tabs mb-4">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`touch-target shrink-0 rounded-full px-4 py-2.5 text-sm ${
                  selectedCategory === "all"
                    ? "bg-orange-600 text-white"
                    : "bg-white border border-zinc-300"
                }`}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`touch-target shrink-0 rounded-full px-4 py-2.5 text-sm ${
                    selectedCategory === category.id
                      ? "bg-orange-600 text-white"
                      : "bg-white border border-zinc-300"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredDishes.map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  disabled={ordersBlocked}
                  onClick={() => addToCart(dish)}
                  className="touch-target rounded-2xl border border-zinc-200 bg-white p-2.5 text-left shadow-sm transition active:scale-[0.98] hover:border-orange-300 disabled:cursor-not-allowed disabled:opacity-50 sm:p-3"
                >
                  {dish.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="mb-3 h-32 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                      Sin foto
                    </div>
                  )}
                  <p className="font-semibold">{dish.name}</p>
                  <p className="text-sm text-zinc-600">{dish.category.name}</p>
                  <p className="mt-2 font-medium text-orange-700">
                    {formatMxn(Number(dish.priceMxn))}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <aside className="card lg:sticky lg:top-36 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto">
            <h2 className="text-lg font-bold">Carrito</h2>
            {cart.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">Sin platillos</p>
            ) : (
              <div className="mt-4 space-y-3">
                {cart.map((item) => (
                  <div key={item.dishId} className="rounded-xl bg-zinc-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-zinc-600">
                          {formatMxn(item.priceMxn)} · {formatUsd(item.priceUsd)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.dishId, item.quantity - 1)}
                          className="touch-target h-10 w-10 rounded-lg border text-lg"
                        >
                          -
                        </button>
                        <span className="min-w-[1.5rem] text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.dishId, item.quantity + 1)}
                          className="touch-target h-10 w-10 rounded-lg border text-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Total MXN</span>
                <strong>{formatMxn(totals.totalMxn)}</strong>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span>Total USD</span>
                <strong>{formatUsd(totals.totalUsd)}</strong>
              </div>
            </div>

            {message ? (
              <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
                {message}
              </p>
            ) : null}
            {cartError ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {cartError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || cart.length === 0 || ordersBlocked}
              className="touch-target mt-4 w-full rounded-xl bg-orange-600 px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? "Creando..." : "Confirmar pedido"}
            </button>
          </aside>
        </Form>
      )}
    </Formik>
  );
}
