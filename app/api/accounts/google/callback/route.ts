import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exchangeGoogleCode, fetchGoogleUserInfo } from "@/lib/google";
import { ACCOUNT_PALETTE, PROVIDER_COLORS, PROVIDER_LIMITS } from "@/lib/normalise";
import { getRequestOrigin } from "@/lib/request-origin";

const STATE_COOKIE = "google_oauth_state";

/** Completes the OAuth flow started by /api/accounts/google/connect. */
export async function GET(req: NextRequest) {
  const session = await auth();
  const url = new URL(req.url);
  const origin = getRequestOrigin(req);

  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;
  let returnTo = "/connect";
  if (stateCookie) {
    try {
      const parsed = JSON.parse(stateCookie) as { returnTo?: string };
      if (parsed.returnTo === "/settings") returnTo = "/settings";
    } catch {
      // ignore malformed cookie
    }
  }

  function fail(message: string) {
    const response = NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(message)}`, origin)
    );
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const error = url.searchParams.get("error");
  if (error) {
    return fail("Google sign-in was cancelled.");
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateCookie || !stateParam) {
    return fail("Invalid response from Google. Please try again.");
  }

  let expectedState: string | undefined;
  try {
    expectedState = (JSON.parse(stateCookie) as { state?: string }).state;
  } catch {
    return fail("Invalid response from Google. Please try again.");
  }

  if (expectedState !== stateParam) {
    return fail("Invalid response from Google. Please try again.");
  }

  const redirectUri = `${origin}/api/accounts/google/callback`;

  let email: string;
  let providerAccountId: string;
  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresAt: number | undefined;
  try {
    const tokens = await exchangeGoogleCode(code, redirectUri);
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);
    email = userInfo.email;
    providerAccountId = userInfo.sub;
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
  } catch (err) {
    console.error("[accounts/google/callback]", err);
    return fail("Couldn't connect that Google account. Please try again.");
  }

  const existing = await db.account.findMany({ where: { userId: session.user.id } });
  const already = existing.find(
    (a) => a.provider === "gmail" && a.providerAccountId === providerAccountId
  );

  if (already) {
    await db.account.update({
      where: { id: already.id },
      data: {
        email,
        accessToken,
        refreshToken: refreshToken ?? already.refreshToken,
        expiresAt: expiresAt ?? already.expiresAt,
      },
    });
  } else {
    if (existing.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      return fail("That account is already connected.");
    }

    const gmailCount = existing.filter((a) => a.provider === "gmail").length;
    if (gmailCount >= PROVIDER_LIMITS.gmail) {
      return fail(`You can connect up to ${PROVIDER_LIMITS.gmail} Google account(s).`);
    }

    await db.account.create({
      data: {
        userId: session.user.id,
        provider: "gmail",
        providerAccountId,
        email,
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt: expiresAt ?? null,
        color: ACCOUNT_PALETTE[existing.length % ACCOUNT_PALETTE.length] ?? PROVIDER_COLORS.gmail,
      },
    });
  }

  const response = NextResponse.redirect(new URL(`${returnTo}?connected=gmail`, origin));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
