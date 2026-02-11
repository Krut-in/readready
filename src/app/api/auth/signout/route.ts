import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "signout_failed",
        message: "Unable to sign out right now.",
      },
      { status: 500 },
    );
  }
}
