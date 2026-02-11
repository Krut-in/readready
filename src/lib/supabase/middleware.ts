import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readPublicEnv } from "../env";

export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; user: User | null }> {
  const envResult = readPublicEnv();
  let response = NextResponse.next({ request });

  if (!envResult.ok) {
    return { response, user: null };
  }

  const supabase = createServerClient(
    envResult.data.NEXT_PUBLIC_SUPABASE_URL,
    envResult.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
          }

          response = NextResponse.next({ request });

          for (const cookie of cookiesToSet) {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
