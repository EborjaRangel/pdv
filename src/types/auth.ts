export type Role = "ADMIN" | "CAJERO" | "MESERO" | "COCINA";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export const roleHome: Record<Role, string> = {
  ADMIN: "/admin",
  CAJERO: "/caja",
  MESERO: "/pedidos",
  COCINA: "/cocina",
};
