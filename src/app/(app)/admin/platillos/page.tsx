"use client";

import { Form, Formik, useFormikContext } from "formik";
import { useEffect, useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { apiFetch } from "@/lib/api-client";
import { dishSchema, type DishValues } from "@/lib/validations";

type Category = { id: string; name: string; active: boolean };
type Dish = {
  id: string;
  name: string;
  priceMxn: string;
  priceUsd: string | null;
  imageUrl: string | null;
  active: boolean;
  categoryId: string;
  category: { name: string };
};

const emptyValues: DishValues = {
  name: "",
  categoryId: "",
  priceMxn: "",
  priceUsd: "",
  imageUrl: "",
};

function ImageUploadField({
  onUploaded,
}: {
  onUploaded: (url: string) => void;
}) {
  const { setFieldValue } = useFormikContext<DishValues>();
  const [uploadError, setUploadError] = useState("");

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    const body = new FormData();
    body.append("file", file);
    const response = await apiFetch("/api/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) {
      setUploadError(data.error ?? "Error al subir");
      return;
    }
    await setFieldValue("imageUrl", data.url);
    onUploaded(data.url);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">
        Foto
        <input
          type="file"
          accept="image/*"
          className="mt-1 w-full text-sm"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
      </label>
      {uploadError ? <p className="mt-1 text-sm text-red-600">{uploadError}</p> : null}
    </div>
  );
}

export default function PlatillosAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<DishValues>(emptyValues);
  const [apiError, setApiError] = useState("");

  async function load() {
    const [categoriesRes, dishesRes] = await Promise.all([
      apiFetch("/api/categories"),
      apiFetch("/api/dishes"),
    ]);
    setCategories(await categoriesRes.json());
    setDishes(await dishesRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(dish: Dish) {
    setEditingId(dish.id);
    setFormValues({
      name: dish.name,
      priceMxn: dish.priceMxn,
      priceUsd: dish.priceUsd ?? "",
      categoryId: dish.categoryId,
      imageUrl: dish.imageUrl ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormValues(emptyValues);
  }

  async function deactivate(id: string) {
    await apiFetch(`/api/dishes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Formik
        enableReinitialize
        initialValues={formValues}
        validationSchema={dishSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          setApiError("");
          const payload = {
            name: values.name,
            priceMxn: Number(values.priceMxn),
            priceUsd: values.priceUsd ? Number(values.priceUsd) : null,
            categoryId: values.categoryId,
            imageUrl: values.imageUrl || null,
          };

          const response = await apiFetch(
            editingId ? `/api/dishes/${editingId}` : "/api/dishes",
            {
              method: editingId ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );

          const data = await response.json();
          setSubmitting(false);

          if (!response.ok) {
            setApiError(data.error ?? "Error al guardar");
            return;
          }

          resetForm({ values: emptyValues });
          setEditingId(null);
          setFormValues(emptyValues);
          load();
        }}
      >
        {({ isSubmitting }) => (
          <Form className="card">
            <h1 className="text-xl font-bold">
              {editingId ? "Editar platillo" : "Nuevo platillo"}
            </h1>
            <div className="mt-4 space-y-3">
              <FormField label="Nombre" name="name" placeholder="Nombre" />
              <FormSelect label="Categoría" name="categoryId">
                <option value="">Selecciona categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </FormSelect>
              <FormField
                label="Precio MXN"
                name="priceMxn"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              <FormField
                label="Precio USD (opcional)"
                name="priceUsd"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              <FormField label="URL de imagen" name="imageUrl" placeholder="URL" />
              <ImageUploadField onUploaded={() => {}} />
            </div>
            {apiError ? <p className="mt-3 text-sm text-red-600">{apiError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border px-4 py-3"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </Form>
        )}
      </Formik>

      <div className="space-y-3">
        {dishes.map((dish) => (
          <article
            key={dish.id}
            className="flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row"
          >
            {dish.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dish.imageUrl}
                alt={dish.name}
                className="h-20 w-20 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-400">
                Sin foto
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{dish.name}</p>
                  <p className="text-sm text-zinc-500">{dish.category.name}</p>
                  <p className="text-sm">${dish.priceMxn} MXN</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    dish.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {dish.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(dish)}
                  className="rounded-lg border px-3 py-1.5 text-sm"
                >
                  Editar
                </button>
                {dish.active ? (
                  <button
                    type="button"
                    onClick={() => deactivate(dish.id)}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700"
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/dishes/${dish.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ active: true }),
                      });
                      load();
                    }}
                    className="rounded-lg border px-3 py-1.5 text-sm"
                  >
                    Activar
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
