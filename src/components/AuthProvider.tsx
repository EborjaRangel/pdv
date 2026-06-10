"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { AppShell } from "@/components/AppShell";
import type { SessionUser } from "@/types/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const response = await apiFetch("/api/auth/me");
      if (!response.ok) {
        router.replace("/login");
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-500 sm:min-h-[60vh]">
        Cargando...
      </div>
    );
  }

  if (!user) return null;

  return <AppShell user={user}>{children}</AppShell>;
}
