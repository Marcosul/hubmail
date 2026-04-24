import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const res = NextResponse.json({ ok: true });
  res.cookies.set("hubmail_session", "", { path: "/", maxAge: 0 });
  res.cookies.set("hubmail_user_email", "", { path: "/", maxAge: 0 });
  return res;
}
