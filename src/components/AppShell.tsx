"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api-client";
import type { Role } from "@/types/auth";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  roles: Role[] | "all";
};

const navItems: NavItem[] = [
  {
    href: "/pedidos",
    label: "Pedidos",
    shortLabel: "Pedidos",
    roles: ["ADMIN", "MESERO", "CAJERO"],
  },
  {
    href: "/caja",
    label: "Caja",
    shortLabel: "Caja",
    roles: ["ADMIN", "CAJERO"],
  },
  {
    href: "/cocina",
    label: "Cocina",
    shortLabel: "Cocina",
    roles: ["ADMIN", "COCINA"],
  },
  {
    href: "/admin",
    label: "Admin",
    shortLabel: "Admin",
    roles: ["ADMIN"],
  },
];

function NavLink({
  item,
  active,
  mobile,
}: {
  item: NavItem;
  active: boolean;
  mobile?: boolean;
}) {
  const base = mobile
    ? "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium"
    : "whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium touch-target";

  const activeClass = mobile
    ? "text-orange-600"
    : "bg-orange-600 text-white";
  const inactiveClass = mobile
    ? "text-zinc-500"
    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200";

  return (
    <Link
      href={item.href}
      className={`${base} ${active ? activeClass : inactiveClass}`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
          active && mobile ? "bg-orange-100 text-orange-700" : mobile ? "bg-zinc-100" : ""
        }`}
      >
        {item.shortLabel.charAt(0)}
      </span>
      <span className={mobile ? "truncate" : ""}>{item.shortLabel}</span>
    </Link>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleNav = navItems.filter(
    (item) => item.roles === "all" || item.roles.includes(user.role),
  );

  function logout() {
    clearToken();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-shell min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-orange-600 sm:text-base">
              PDV Restaurante
            </p>
            <p className="truncate text-xs text-zinc-500">
              {user.name} · {user.role}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="touch-target shrink-0 rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          >
            Salir
          </button>
        </div>

        <nav className="mx-auto hidden max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 md:flex">
          {visibleNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>
      </header>

      <main className="app-main mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        {children}
      </main>

      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-lg">
          {visibleNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
              mobile
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
