"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { roleHome, type Role } from "@/types/auth";
import { getServerApiBase } from "@/lib/api-base";

const apiProxy = getServerApiBase();
const COOKIE_NAME = "pdv_token";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Credenciales%20requeridas");
  }

  let response: Response;
  try {
    response = await fetch(`${apiProxy}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    redirect("/login?error=No%20hay%20conexi%C3%B3n%20con%20el%20API");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.token) {
    redirect("/login?error=Credenciales%20inv%C3%A1lidas");
  }

  const cookieStore = await cookies();
  const headerList = await headers();
  const secure = headerList.get("x-forwarded-proto") === "https";

  cookieStore.set(COOKIE_NAME, data.token, {
    path: "/",
    maxAge: 43200,
    sameSite: "lax",
    httpOnly: false,
    secure,
  });

  redirect(roleHome[data.user.role as Role] ?? "/pedidos");
}
