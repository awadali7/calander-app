import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncAccount } from "@/lib/sync";

type GraphNotification = {
  subscriptionId?: string;
  clientState?: string;
};

/** Microsoft Graph subscription validation handshake — echo back the token. */
export async function GET(req: Request) {
  const validationToken = new URL(req.url).searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const validationToken = new URL(req.url).searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const body = (await req.json().catch(() => null)) as { value?: GraphNotification[] } | null;
  const notifications = body?.value ?? [];

  for (const notification of notifications) {
    if (notification.clientState !== "unical-outlook") continue;

    const account = await db.account.findFirst({ where: { provider: "outlook" } });
    if (account) {
      await syncAccount(account).catch((err) =>
        console.error(`[webhook:outlook] sync failed for ${account.email}`, err)
      );
    }
  }

  return NextResponse.json({ ok: true });
}
