"use client";

import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { FormField } from "@/components/FormField";
import { apiFetch } from "@/lib/api-client";
import { categorySchema } from "@/lib/validations";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export default function CategoriasAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  async function load() {
    const response = await apiFetch("/api/categories");
    setCategories(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="w-full max-w-2xl min-w-0">
      <h1 className="page-title">Categorías</h1>

      <Formik
        initialValues={{ name: "", sortOrder: 0 }}
        validationSchema={categorySchema}
        onSubmit={async (values, { resetForm, setSubmitting }) => {
          await apiFetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          resetForm();
          setSubmitting(false);
          load();
        }}
      >
        {({ isSubmitting }) => (
          <Form className="card mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 sm:min-w-[200px]">
              <FormField label="Nombre" name="name" placeholder="Nombre" />
            </div>
            <div className="w-full sm:w-24">
              <FormField label="Orden" name="sortOrder" type="number" />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-60 sm:w-auto"
            >
              Agregar
            </button>
          </Form>
        )}
      </Formik>

      <div className="mt-6 space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-2xl border bg-white p-4"
          >
            <div>
              <p className="font-medium">{category.name}</p>
              <p className="text-sm text-zinc-500">Orden {category.sortOrder}</p>
            </div>
            <div className="flex gap-2">
              {!category.active ? (
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/categories/${category.id}`, {
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
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/categories/${category.id}`, {
                      method: "DELETE",
                    });
                    load();
                  }}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700"
                >
                  Desactivar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
