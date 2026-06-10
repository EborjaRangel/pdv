"use client";

import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { apiFetch } from "@/lib/api-client";
import { userSchema } from "@/lib/validations";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
};

export default function UsuariosAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [apiError, setApiError] = useState("");

  async function load() {
    const response = await apiFetch("/api/users");
    setUsers(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Formik
        initialValues={{
          email: "",
          name: "",
          password: "",
          role: "MESERO",
        }}
        validationSchema={userSchema}
        onSubmit={async (values, { resetForm, setSubmitting }) => {
          setApiError("");
          const response = await apiFetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          setSubmitting(false);

          if (!response.ok) {
            const data = await response.json();
            setApiError(data.error ?? "Error al crear usuario");
            return;
          }

          resetForm();
          load();
        }}
      >
        {({ isSubmitting }) => (
          <Form className="card">
            <h1 className="text-xl font-bold">Nuevo usuario</h1>
            <div className="mt-4 space-y-3">
              <FormField label="Nombre" name="name" placeholder="Nombre" />
              <FormField label="Correo" name="email" type="email" placeholder="Correo" />
              <FormField
                label="Contraseña"
                name="password"
                type="password"
                placeholder="Contraseña"
              />
              <FormSelect label="Rol" name="role">
                <option value="ADMIN">Admin</option>
                <option value="CAJERO">Cajero</option>
                <option value="MESERO">Mesero</option>
                <option value="COCINA">Cocina</option>
              </FormSelect>
              <p className="text-xs text-zinc-500">
                Cajero: caja, cobro, corte y tomar pedidos. Mesero: solo pedidos.
              </p>
            </div>
            {apiError ? <p className="mt-3 text-sm text-red-600">{apiError}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Creando..." : "Crear usuario"}
            </button>
          </Form>
        )}
      </Formik>

      <div className="space-y-3">
        {users.map((user) => (
          <article key={user.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-zinc-500">{user.email}</p>
                <p className="text-sm">{user.role}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await apiFetch(`/api/users/${user.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ active: !user.active }),
                  });
                  load();
                }}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                {user.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
