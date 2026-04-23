import { NextResponse } from "next/server";

const SESSION = "hubmail_session";
const USER_EMAIL = "hubmail_user_email";

export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  if (email) {
    res.cookies.set(USER_EMAIL, email, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return res;
}
