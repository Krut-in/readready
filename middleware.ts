import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getRedirectTarget } from "@/lib/supabase/auth-routing";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { response, user } = await updateSession(request);

  const redirectTarget = getRedirectTarget(request.nextUrl.pathname, Boolean(user));
  if (!redirectTarget) {
    return response;
  }

  const redirectUrl = new URL(redirectTarget, request.url);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
