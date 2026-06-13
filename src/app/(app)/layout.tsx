import { AppShell } from "@/components/AppShell";
import { TokenSync } from "@/components/TokenSync";
import { getSessionUser } from "@/lib/auth-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <>
      <TokenSync />
      <AppShell user={user}>{children}</AppShell>
    </>
  );
}
