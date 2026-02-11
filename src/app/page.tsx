import Link from "next/link";
import { BookOpenText, Upload } from "lucide-react";

import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";

export default function Home() {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <p className="text-xs tracking-[0.24em] text-primary uppercase">ReadReady P-1</p>
        <h1 className="max-w-3xl text-4xl leading-tight font-semibold sm:text-5xl">
          A distraction-minimal reading sanctuary for deep EPUB sessions.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          Foundation phase is active: auth, protected routes, storage-ready EPUB upload, and theme-capable shell.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Get started</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <BookOpenText className="mr-2 size-4" />
              Continue to sign in
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium"
            >
              <Upload className="mr-2 size-4" />
              Open upload screen
            </Link>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Environment status</h2>
          <p className={configured ? "text-sm text-emerald-600" : "text-sm text-amber-600"}>
            {configured
              ? "Supabase environment variables are configured."
              : "Supabase environment variables are missing. Add values from .env.example to enable auth and uploads."}
          </p>
          <p className="text-sm text-muted-foreground">
            Upload validation is capped at 100 MB and supports EPUB only. DRM-protected files are intentionally unsupported.
          </p>
        </Card>
      </section>
    </main>
  );
}
