import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { getGoogleAuthUrl } from "@/lib/google";

const STATE_COOKIE = "google_oauth_state";

/** Kicks off the OAuth flow to link an additional Google Calendar account. */
export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const returnTo = url.searchParams.get("returnTo") === "/settings" ? "/settings" : "/connect";
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${url.origin}/api/accounts/google/callback`;

  const response = NextResponse.redirect(getGoogleAuthUrl(redirectUri, state));
  response.cookies.set(STATE_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
