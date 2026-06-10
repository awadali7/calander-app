import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function authoriseEvent(userId: string, id: string) {
  const event = await db.calEvent.findUnique({ where: { id } });
  if (!event || event.userId !== userId) return null;
  return event;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await authoriseEvent(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, start, end, type, location, description } = body as {
    title?: string;
    start?: string;
    end?: string;
    type?: string;
    location?: string;
    description?: string;
  };

  const updated = await db.calEvent.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(start !== undefined ? { start: new Date(start) } : {}),
      ...(end !== undefined ? { end: new Date(end) } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  return NextResponse.json({ event: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await authoriseEvent(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.calEvent.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
