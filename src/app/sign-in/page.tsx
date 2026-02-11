import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Card } from "@/components/ui/card";
import { readPublicEnv } from "@/lib/env";

type SignInPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = params?.next ?? "/dashboard";
  const envStatus = readPublicEnv();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10 sm:px-6">
      <Card className="w-full space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Sign in to ReadReady</h1>
          <p className="text-sm text-muted-foreground">
            P-1 auth uses Google OAuth via Supabase. Sign in to access protected routes and upload EPUB files.
          </p>
        </div>

        {envStatus.ok ? (
          <GoogleSignInButton nextPath={next} />
        ) : (
          <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
            <p>{envStatus.message}</p>
            <p>Add values in `.env.local` from `.env.example`, then retry sign-in.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          By continuing, you will be redirected to Google and then back to ReadReady.
        </p>

        <Link href="/" className="inline-flex text-sm text-primary underline underline-offset-4">
          Back to home
        </Link>
      </Card>
    </main>
  );
}
