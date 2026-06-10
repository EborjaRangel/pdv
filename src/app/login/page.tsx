"use client";

import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/FormField";
import { apiFetch, setToken } from "@/lib/api-client";
import { loginSchema } from "@/lib/validations";
import { roleHome, type Role } from "@/types/auth";

export default function LoginPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState("");

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Formik
        initialValues={{ email: "admin@pdv.local", password: "admin123" }}
        validationSchema={loginSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setApiError("");
          const response = await apiFetch("/api/auth/login", {
            method: "POST",
            body: JSON.stringify(values),
          });
          const data = await response.json();
          setSubmitting(false);

          if (!response.ok) {
            setApiError(data.error ?? "Error al iniciar sesión");
            return;
          }

          setToken(data.token);
          router.push(roleHome[data.user.role as Role] ?? "/pedidos");
          router.refresh();
        }}
      >
        {({ isSubmitting }) => (
          <Form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <h1 className="text-2xl font-bold text-zinc-900">PDV Restaurante</h1>
            <p className="mt-1 text-sm text-zinc-500">Inicia sesión para continuar</p>

            <div className="mt-6 space-y-4">
              <FormField label="Correo" name="email" type="email" autoComplete="email" />
              <FormField
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </div>

            {apiError ? <p className="mt-4 text-sm text-red-600">{apiError}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target mt-6 w-full rounded-xl bg-orange-600 px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
