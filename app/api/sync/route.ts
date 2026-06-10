import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncUser } from "@/lib/sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const synced = await syncUser(session.user.id);

  return NextResponse.json({ synced });
}
