import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { exchangeMicrosoftCode, fetchMicrosoftUserInfo } from "@/lib/microsoft";
import { ACCOUNT_PALETTE, PROVIDER_COLORS, PROVIDER_LIMITS } from "@/lib/normalise";
import { getRequestOrigin } from "@/lib/request-origin";

const STATE_COOKIE = "microsoft_oauth_state";

/** Completes the OAuth flow started by /api/accounts/microsoft/connect. */
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
    return fail("Microsoft sign-in was cancelled.");
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateCookie || !stateParam) {
    return fail("Invalid response from Microsoft. Please try again.");
  }

  let expectedState: string | undefined;
  try {
    expectedState = (JSON.parse(stateCookie) as { state?: string }).state;
  } catch {
    return fail("Invalid response from Microsoft. Please try again.");
  }

  if (expectedState !== stateParam) {
    return fail("Invalid response from Microsoft. Please try again.");
  }

  const redirectUri = `${origin}/api/accounts/microsoft/callback`;

  let email: string;
  let providerAccountId: string;
  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresAt: number | undefined;
  try {
    const tokens = await exchangeMicrosoftCode(code, redirectUri);
    const userInfo = await fetchMicrosoftUserInfo(tokens.access_token);
    email = userInfo.mail ?? userInfo.userPrincipalName;
    providerAccountId = userInfo.id;
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
  } catch (err) {
    console.error("[accounts/microsoft/callback]", err);
    return fail("Couldn't connect that Outlook account. Please try again.");
  }

  const existing = await db.account.findMany({ where: { userId: session.user.id } });
  const already = existing.find(
    (a) => a.provider === "outlook" && a.providerAccountId === providerAccountId
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

    const outlookCount = existing.filter((a) => a.provider === "outlook").length;
    if (outlookCount >= PROVIDER_LIMITS.outlook) {
      return fail(`You can connect up to ${PROVIDER_LIMITS.outlook} Outlook account(s).`);
    }

    try {
      await db.account.create({
        data: {
          userId: session.user.id,
          provider: "outlook",
          providerAccountId,
          email,
          accessToken,
          refreshToken: refreshToken ?? null,
          expiresAt: expiresAt ?? null,
          color: ACCOUNT_PALETTE[existing.length % ACCOUNT_PALETTE.length] ?? PROVIDER_COLORS.outlook,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return fail("That Outlook account is already connected to another UniCal user.");
      }
      throw err;
    }
  }

  const response = NextResponse.redirect(new URL(`${returnTo}?connected=outlook`, origin));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
