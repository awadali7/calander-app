import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { getMicrosoftAuthUrl } from "@/lib/microsoft";

const STATE_COOKIE = "microsoft_oauth_state";

/** Kicks off the OAuth flow to link an additional Outlook Calendar account. */
export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const returnTo = url.searchParams.get("returnTo") === "/settings" ? "/settings" : "/connect";
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${url.origin}/api/accounts/microsoft/callback`;

  const response = NextResponse.redirect(getMicrosoftAuthUrl(redirectUri, state));
  response.cookies.set(STATE_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
