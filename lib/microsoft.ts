import type { OutlookRawEvent } from "./normalise";

const GRAPH_API = "https://graph.microsoft.com/v1.0";

/** Fetches upcoming events from a connected Outlook (Microsoft Graph) account. */
export async function fetchOutlookEvents(
  accessToken: string,
  opts: { start?: Date; end?: Date } = {}
): Promise<OutlookRawEvent[]> {
  const start = (opts.start ?? new Date()).toISOString();
  const end = (opts.end ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString();

  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    $orderby: "start/dateTime",
    $top: "250",
  });

  const res = await fetch(`${GRAPH_API}/me/calendarView?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Microsoft Graph API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { value?: OutlookRawEvent[] };
  return data.value ?? [];
}

/** Creates a Microsoft Graph change-notification subscription for the user's calendar. */
export async function registerOutlookWebhook(
  accessToken: string,
  notificationUrl: string
): Promise<void> {
  const expirationDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const res = await fetch(`${GRAPH_API}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType: "created,updated,deleted",
      notificationUrl,
      resource: "me/events",
      expirationDateTime,
      clientState: "unical-outlook",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to register Outlook webhook: ${res.status} ${res.statusText}`);
  }
}
