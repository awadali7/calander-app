export type Provider = "gmail" | "outlook" | "apple";
export type EventType = "video" | "meeting" | "personal";

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  account: string; // email address
  accountId: string;
  provider: Provider;
  color: string;
  type: EventType;
  sourceId: string; // original ID from the provider
  location?: string | null;
  description?: string | null;
};

export const PROVIDER_COLORS: Record<Provider, string> = {
  gmail: "#2563EB",
  outlook: "#7C3AED",
  apple: "#059669",
};

/** Max number of accounts a user may connect per provider. */
export const PROVIDER_LIMITS: Record<Provider, number> = {
  gmail: 5,
  outlook: 5,
  apple: 1,
};

/** Colors assigned to successive connected accounts of a user. */
export const ACCOUNT_PALETTE = ["#2563EB", "#7C3AED", "#059669", "#F59E0B", "#EC4899"];

/** Raw event shape returned by the Google Calendar API. */
export type GoogleRawEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  hangoutLink?: string;
  conferenceData?: unknown;
};

/** Raw event shape returned by Microsoft Graph. */
export type OutlookRawEvent = {
  id: string;
  subject?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  location?: { displayName?: string };
  bodyPreview?: string;
  isOnlineMeeting?: boolean;
};

/** Raw event shape returned from a CalDAV (Apple) feed. */
export type AppleRawEvent = {
  uid: string;
  summary?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
};

type AccountRef = {
  id: string;
  email: string;
  provider: Provider;
  color: string;
};

function classify(title: string, location?: string | null, hasVideo?: boolean): EventType {
  const text = `${title} ${location ?? ""}`.toLowerCase();
  if (hasVideo || /zoom|meet|teams|hangout|video/.test(text)) return "video";
  if (/1:1|sync|standup|review|interview|meeting|call/.test(text)) return "meeting";
  return "personal";
}

export function normaliseGoogleEvent(raw: GoogleRawEvent, account: AccountRef): CalEvent | null {
  const startStr = raw.start?.dateTime ?? raw.start?.date;
  const endStr = raw.end?.dateTime ?? raw.end?.date;
  if (!startStr || !endStr) return null;
  return {
    id: `${account.id}:${raw.id}`,
    title: raw.summary ?? "(No title)",
    start: new Date(startStr),
    end: new Date(endStr),
    account: account.email,
    accountId: account.id,
    provider: "gmail",
    color: account.color,
    type: classify(raw.summary ?? "", raw.location, !!raw.hangoutLink || !!raw.conferenceData),
    sourceId: raw.id,
    location: raw.location ?? null,
    description: raw.description ?? null,
  };
}

export function normaliseOutlookEvent(raw: OutlookRawEvent, account: AccountRef): CalEvent | null {
  const startStr = raw.start?.dateTime;
  const endStr = raw.end?.dateTime;
  if (!startStr || !endStr) return null;
  return {
    id: `${account.id}:${raw.id}`,
    title: raw.subject ?? "(No title)",
    start: new Date(`${startStr}Z`),
    end: new Date(`${endStr}Z`),
    account: account.email,
    accountId: account.id,
    provider: "outlook",
    color: account.color,
    type: classify(raw.subject ?? "", raw.location?.displayName, raw.isOnlineMeeting),
    sourceId: raw.id,
    location: raw.location?.displayName ?? null,
    description: raw.bodyPreview ?? null,
  };
}

export function normaliseAppleEvent(raw: AppleRawEvent, account: AccountRef): CalEvent | null {
  if (!raw.start || !raw.end) return null;
  return {
    id: `${account.id}:${raw.uid}`,
    title: raw.summary ?? "(No title)",
    start: new Date(raw.start),
    end: new Date(raw.end),
    account: account.email,
    accountId: account.id,
    provider: "apple",
    color: account.color,
    type: classify(raw.summary ?? "", raw.location),
    sourceId: raw.uid,
    location: raw.location ?? null,
    description: raw.description ?? null,
  };
}
