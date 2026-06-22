import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ACCOUNT_PALETTE, PROVIDER_COLORS, PROVIDER_LIMITS, type Provider } from "@/lib/normalise";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await db.account.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      email: true,
      color: true,
      label: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      email: a.email,
      color: a.color,
      label: a.label,
      createdAt: a.createdAt,
      eventCount: a._count.events,
    })),
  });
}

/**
 * Connects an Apple Calendar account for the signed-in user.
 *
 * Apple has no app-registration OAuth flow available here, so this endpoint
 * accepts the connecting email directly (demo flow). Google and Outlook go
 * through real OAuth via /api/accounts/google/connect and
 * /api/accounts/microsoft/connect respectively.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { provider, email, label } = body as { provider?: string; email?: string; label?: string };

  if (!provider || !email) {
    return NextResponse.json({ error: "provider and email are required" }, { status: 400 });
  }
  if (provider !== "apple") {
    return NextResponse.json(
      {
        error:
          provider === "gmail"
            ? "Google accounts must be connected via /api/accounts/google/connect"
            : provider === "outlook"
            ? "Outlook accounts must be connected via /api/accounts/microsoft/connect"
            : "Unknown provider",
      },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const existing = await db.account.findMany({ where: { userId: session.user.id } });
  if (existing.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "That account is already connected" }, { status: 409 });
  }

  const sameProvider = existing.filter((a) => a.provider === provider);
  if (sameProvider.length >= PROVIDER_LIMITS[provider as Provider]) {
    return NextResponse.json(
      { error: `You can connect up to ${PROVIDER_LIMITS[provider as Provider]} ${provider} account(s)` },
      { status: 409 }
    );
  }

  const account = await db.account.create({
    data: {
      userId: session.user.id,
      provider,
      providerAccountId: crypto.randomUUID(),
      email,
      accessToken: `placeholder-${crypto.randomUUID()}`,
      refreshToken: null,
      color: ACCOUNT_PALETTE[existing.length % ACCOUNT_PALETTE.length] ?? PROVIDER_COLORS[provider as Provider],
      label: label || null,
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
