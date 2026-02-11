import { AppShell } from "@/components/layout/app-shell";
import { readPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  let userEmail: string | null = null;

  const env = readPublicEnv();
  if (env.ok) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return <AppShell userEmail={userEmail}>{children}</AppShell>;
}
