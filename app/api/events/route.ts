import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { CalEvent, Provider } from "@/lib/normalise";

function toCalEvent(event: {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  location: string | null;
  description: string | null;
  account: { id: string; email: string; provider: string; color: string };
}): CalEvent {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    account: event.account.email,
    accountId: event.account.id,
    provider: event.account.provider as Provider,
    color: event.account.color,
    type: event.type as CalEvent["type"],
    sourceId: event.id,
    location: event.location,
    description: event.description,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await db.calEvent.findMany({
    where: { userId: session.user.id },
    include: { account: true },
    orderBy: { start: "asc" },
  });

  return NextResponse.json({ events: events.map(toCalEvent) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, start, end, accountId, type, location, description } = body as {
    title?: string;
    start?: string;
    end?: string;
    accountId?: string;
    type?: string;
    location?: string;
    description?: string;
  };

  if (!title || !start || !end || !accountId) {
    return NextResponse.json(
      { error: "title, start, end and accountId are required" },
      { status: 400 }
    );
  }

  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== session.user.id) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const created = await db.calEvent.create({
    data: {
      userId: session.user.id,
      accountId,
      sourceId: `local:${crypto.randomUUID()}`,
      title,
      start: new Date(start),
      end: new Date(end),
      type: type ?? "meeting",
      location,
      description,
    },
    include: { account: true },
  });

  return NextResponse.json({ event: toCalEvent(created) }, { status: 201 });
}
