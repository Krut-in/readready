"use client";

import { useState } from "react";
import { Chrome } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GoogleSignInButtonProps = {
  nextPath?: string;
};

export function GoogleSignInButton({ nextPath = "/dashboard" }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getRedirectTo(): string {
    const browserBase = typeof window !== "undefined" ? window.location.origin : undefined;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? browserBase ?? "http://localhost:3000";
    const callback = new URL("/auth/callback", baseUrl);
    callback.searchParams.set("next", nextPath);
    return callback.toString();
  }

  async function handleGoogleSignIn(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectTo(),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthError) {
        setError("Unable to start Google sign-in. Check your Supabase Google OAuth setup.");
      }
    } catch {
      setError("Sign-in is unavailable right now. Verify environment variables and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" size="lg" onClick={handleGoogleSignIn} disabled={isLoading}>
        <Chrome className="mr-2 size-4" />
        {isLoading ? "Redirecting..." : "Continue with Google"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
