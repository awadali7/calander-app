import cron from "node-cron";
import { db } from "./db";
import { fetchGoogleEvents } from "./google";
import { fetchOutlookEvents } from "./microsoft";
import { fetchAppleEvents } from "./apple";
import {
  normaliseGoogleEvent,
  normaliseOutlookEvent,
  normaliseAppleEvent,
} from "./normalise";
import type { Account } from "@prisma/client";

const SYNC_WINDOW_DAYS = 30;

function syncWindow() {
  const start = new Date();
  const end = new Date(Date.now() + SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Pulls events for one account from its provider and upserts them into the DB. */
export async function syncAccount(account: Account): Promise<number> {
  const { start, end } = syncWindow();
  const ref = {
    id: account.id,
    email: account.email,
    provider: account.provider as "gmail" | "outlook" | "apple",
    color: account.color,
  };

  const normalised =
    account.provider === "gmail"
      ? (await fetchGoogleEvents(account.accessToken, { timeMin: start, timeMax: end }))
          .map((raw) => normaliseGoogleEvent(raw, ref))
      : account.provider === "outlook"
      ? (await fetchOutlookEvents(account.accessToken, { start, end }))
          .map((raw) => normaliseOutlookEvent(raw, ref))
      : (
          await fetchAppleEvents(account.accessToken, account.email, account.refreshToken ?? "", {
            start,
            end,
          })
        ).map((raw) => normaliseAppleEvent(raw, ref));

  let count = 0;
  for (const event of normalised) {
    if (!event) continue;
    await db.calEvent.upsert({
      where: { accountId_sourceId: { accountId: account.id, sourceId: event.sourceId } },
      update: {
        title: event.title,
        start: event.start,
        end: event.end,
        type: event.type,
        location: event.location,
        description: event.description,
        syncedAt: new Date(),
      },
      create: {
        userId: account.userId,
        accountId: account.id,
        sourceId: event.sourceId,
        title: event.title,
        start: event.start,
        end: event.end,
        type: event.type,
        location: event.location,
        description: event.description,
      },
    });
    count++;
  }

  return count;
}

/** Re-syncs every connected account for a given user. Returns the total event count synced. */
export async function syncUser(userId: string): Promise<number> {
  const accounts = await db.account.findMany({ where: { userId } });
  let total = 0;
  for (const account of accounts) {
    try {
      total += await syncAccount(account);
    } catch (err) {
      console.error(`[sync] failed for account ${account.email} (${account.provider})`, err);
    }
  }
  return total;
}

/** Polls every connected Apple account. Google/Outlook stay fresh via push webhooks. */
export async function syncAppleCalendars(): Promise<void> {
  const accounts = await db.account.findMany({ where: { provider: "apple" } });
  for (const account of accounts) {
    try {
      await syncAccount(account);
    } catch (err) {
      console.error(`[sync] Apple poll failed for ${account.email}`, err);
    }
  }
}

let cronStarted = false;

/** Starts the background cron schedule once per server process. */
export function startBackgroundSync(): void {
  if (cronStarted) return;
  cronStarted = true;

  // Apple has no webhook support, so it's polled every 5 minutes.
  cron.schedule("*/5 * * * *", () => {
    syncAppleCalendars().catch((err) => console.error("[sync] Apple cron run failed", err));
  });
}
