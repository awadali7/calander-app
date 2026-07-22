import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { getGoogleAuthUrl } from "@/lib/google";
import { getRequestOrigin } from "@/lib/request-origin";

const STATE_COOKIE = "google_oauth_state";

/** Kicks off the OAuth flow to link an additional Google Calendar account. */
export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  const origin = getRequestOrigin(req);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const returnTo = url.searchParams.get("returnTo") === "/settings" ? "/settings" : "/connect";
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${origin}/api/accounts/google/callback`;

  const response = NextResponse.redirect(getGoogleAuthUrl(redirectUri, state));
  response.cookies.set(STATE_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
