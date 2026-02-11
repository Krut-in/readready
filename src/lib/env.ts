import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function readRawPublicEnv(): Record<keyof PublicEnv, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

export function readPublicEnv(): { ok: true; data: PublicEnv } | { ok: false; message: string } {
  const parsed = publicEnvSchema.safeParse(readRawPublicEnv());
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  const flattened = parsed.error.flatten().fieldErrors;
  const missing = Object.entries(flattened)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .map(([key]) => key)
    .join(", ");

  return {
    ok: false,
    message: missing
      ? `Missing or invalid environment variables: ${missing}.`
      : "Missing or invalid environment variables.",
  };
}

export function getPublicEnvOrThrow(): PublicEnv {
  const parsed = readPublicEnv();
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  return parsed.data;
}

export function isSupabaseConfigured(): boolean {
  return readPublicEnv().ok;
}
