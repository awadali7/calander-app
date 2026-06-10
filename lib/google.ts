import type { GoogleRawEvent } from "./normalise";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** Fetches upcoming events from a connected Google Calendar account. */
export async function fetchGoogleEvents(
  accessToken: string,
  opts: { timeMin?: Date; timeMax?: Date } = {}
): Promise<GoogleRawEvent[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: (opts.timeMin ?? new Date()).toISOString(),
    ...(opts.timeMax ? { timeMax: opts.timeMax.toISOString() } : {}),
    maxResults: "250",
  });

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { items?: GoogleRawEvent[] };
  return data.items ?? [];
}

/** Registers a push-notification channel so Google can notify us of changes. */
export async function registerGoogleWebhook(
  accessToken: string,
  channelId: string,
  webhookUrl: string
): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: channelId, type: "web_hook", address: webhookUrl }),
  });

  if (!res.ok) {
    throw new Error(`Failed to register Google webhook: ${res.status} ${res.statusText}`);
  }
}
