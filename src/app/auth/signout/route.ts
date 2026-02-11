import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request): Promise<NextResponse> {
  const redirectUrl = new URL("/sign-in", request.url);

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Fall through to sign-in page regardless.
  }

  return NextResponse.redirect(redirectUrl);
}
