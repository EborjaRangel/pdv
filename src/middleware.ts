import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { roleHome, type Role } from "@/types/auth";

const COOKIE_NAME = "pdv_token";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me-in-production",
);

const publicPaths = ["/login"];

const rolePaths: Record<string, Role[]> = {
  "/admin": ["ADMIN"],
  "/caja": ["ADMIN", "CAJERO"],
  "/pedidos": ["ADMIN", "MESERO", "CAJERO"],
  "/cocina": ["ADMIN", "COCINA"],
  "/imprimir": ["ADMIN", "CAJERO"],
};

async function getRoleFromToken(token: string): Promise<Role | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role as Role;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = await getRoleFromToken(token);
  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(roleHome[role], request.url));
  }

  for (const [prefix, roles] of Object.entries(rolePaths)) {
    if (pathname.startsWith(prefix) && !roles.includes(role)) {
      return NextResponse.redirect(new URL(roleHome[role], request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
