"use client";

import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { FormField } from "@/components/FormField";
import { apiFetch } from "@/lib/api-client";
import { settingsSchema } from "@/lib/validations";

export default function ConfiguracionAdminPage() {
  const [initialValues, setInitialValues] = useState({
    restaurantName: "",
    rfc: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function load() {
      const response = await apiFetch("/api/settings");
      const data = await response.json();
      if (response.ok && data) {
        setInitialValues({
          restaurantName: data.restaurantName ?? "",
          rfc: data.rfc ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-zinc-500">Cargando...</p>;
  }

  return (
    <div className="w-full max-w-md min-w-0">
      <h1 className="page-title">Configuración</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Solo el administrador captura el nombre del restaurante y el RFC.
      </p>

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={settingsSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          setMessage("");
          setApiError("");

          const response = await apiFetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurantName: values.restaurantName.trim(),
              rfc: values.rfc.trim().toUpperCase(),
            }),
          });

          const data = await response.json();
          setSubmitting(false);

          if (!response.ok) {
            setApiError(data.error ?? "Error al guardar");
            return;
          }

          resetForm({
            values: {
              restaurantName: data.restaurantName ?? values.restaurantName,
              rfc: data.rfc ?? values.rfc,
            },
          });
          setMessage("Nombre y RFC guardados. Aparecerán en los tickets.");
        }}
      >
        {({ values, isSubmitting }) => (
          <Form className="card mt-4 space-y-4">
            <FormField
              label="Nombre del restaurante *"
              name="restaurantName"
              placeholder="Ej. Taquería El Sol"
            />
            <FormField
              label="RFC *"
              name="rfc"
              placeholder="Ej. XAXX010101000"
              maxLength={13}
              className="uppercase"
            />

            <div className="rounded-xl bg-zinc-50 p-3 text-sm">
              <p className="text-center font-bold">
                {values.restaurantName.trim() || "Nombre del restaurante"}
              </p>
              <p className="text-center">
                RFC: {values.rfc.trim().toUpperCase() || "—"}
              </p>
            </div>

            {apiError ? <p className="text-sm text-red-600">{apiError}</p> : null}
            {message ? <p className="text-sm text-green-700">{message}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
