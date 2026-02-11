import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/dashboard";
  }

  return nextPath;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("error", "missing_oauth_code");
    return NextResponse.redirect(url);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("error", "oauth_exchange_failed");
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = nextPath;
    url.search = "";
    return NextResponse.redirect(url);
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("error", "oauth_callback_unavailable");
    return NextResponse.redirect(url);
  }
}
