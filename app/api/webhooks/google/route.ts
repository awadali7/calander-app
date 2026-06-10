import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncAccount } from "@/lib/sync";

/**
 * Google Calendar push notifications carry no payload — they're a signal to
 * re-fetch. The channel/resource ids identify which account changed.
 */
export async function POST(req: Request) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  if (!channelId || resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  const account = await db.account.findFirst({
    where: { provider: "gmail", providerAccountId: channelId },
  });

  if (account) {
    await syncAccount(account).catch((err) =>
      console.error(`[webhook:google] sync failed for ${account.email}`, err)
    );
  }

  return NextResponse.json({ ok: true });
}
