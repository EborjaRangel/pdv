import * as Yup from "yup";

export const loginSchema = Yup.object({
  email: Yup.string().email("Correo inválido").required("Correo requerido"),
  password: Yup.string().required("Contraseña requerida"),
});

export const settingsSchema = Yup.object({
  restaurantName: Yup.string()
    .trim()
    .required("Captura el nombre del restaurante"),
  rfc: Yup.string()
    .trim()
    .transform((value) => value?.toUpperCase())
    .min(12, "El RFC debe tener 12 o 13 caracteres")
    .max(13, "El RFC debe tener 12 o 13 caracteres")
    .required("Captura el RFC del restaurante"),
});

export const categorySchema = Yup.object({
  name: Yup.string().trim().required("Nombre requerido"),
  sortOrder: Yup.number()
    .typeError("Orden inválido")
    .integer("Orden inválido")
    .min(0, "Orden inválido")
    .required("Orden requerido"),
});

export const userSchema = Yup.object({
  name: Yup.string().trim().required("Nombre requerido"),
  email: Yup.string().email("Correo inválido").required("Correo requerido"),
  password: Yup.string()
    .min(6, "Mínimo 6 caracteres")
    .required("Contraseña requerida"),
  role: Yup.string()
    .oneOf(["ADMIN", "CAJERO", "MESERO", "COCINA"], "Rol inválido")
    .required("Rol requerido"),
});

export const dishSchema = Yup.object({
  name: Yup.string().trim().required("Nombre requerido"),
  categoryId: Yup.string().required("Selecciona una categoría"),
  priceMxn: Yup.string()
    .required("Precio MXN requerido")
    .test("price-mxn", "Precio MXN inválido", (value) => {
      const n = Number(value);
      return !Number.isNaN(n) && n > 0;
    }),
  priceUsd: Yup.string()
    .test("price-usd", "Precio USD inválido", (value) => {
      if (!value) return true;
      const n = Number(value);
      return !Number.isNaN(n) && n > 0;
    })
    .optional(),
  imageUrl: Yup.string().optional(),
});

export const orderCustomerSchema = Yup.object({
  customerName: Yup.string()
    .trim()
    .required("El nombre del cliente es obligatorio"),
  customerPhone: Yup.string().trim().nullable(),
});

export type LoginValues = Yup.InferType<typeof loginSchema>;
export type SettingsValues = Yup.InferType<typeof settingsSchema>;
export type CategoryValues = Yup.InferType<typeof categorySchema>;
export type UserValues = Yup.InferType<typeof userSchema>;
export type DishValues = Yup.InferType<typeof dishSchema>;
export type OrderCustomerValues = Yup.InferType<typeof orderCustomerSchema>;
