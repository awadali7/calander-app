import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { detectConflictPairs } from "@/lib/conflicts";
import type { CalEvent, Provider } from "@/lib/normalise";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbEvents = await db.calEvent.findMany({
    where: { userId: session.user.id },
    include: { account: true },
    orderBy: { start: "asc" },
  });

  const events: CalEvent[] = dbEvents.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    account: e.account.email,
    accountId: e.account.id,
    provider: e.account.provider as Provider,
    color: e.account.color,
    type: e.type as CalEvent["type"],
    sourceId: e.id,
    location: e.location,
    description: e.description,
  }));

  const pairs = detectConflictPairs(events).map(({ a, b }) => ({
    a: { id: a.id, title: a.title, start: a.start, end: a.end, account: a.account, provider: a.provider },
    b: { id: b.id, title: b.title, start: b.start, end: b.end, account: b.account, provider: b.provider },
  }));

  return NextResponse.json({ conflicts: pairs });
}
