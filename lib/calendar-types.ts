import type { EventType, Provider } from "./normalise";

export type ClientEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  account: string;
  accountId: string;
  provider: Provider;
  color: string;
  type: EventType;
  location?: string | null;
  description?: string | null;
};

export type ClientAccount = {
  id: string;
  provider: Provider;
  email: string;
  color: string;
  label: string | null;
  eventCount: number;
};

/** Parses the JSON payload from /api/events into Date-bearing client events. */
export function parseEvents(raw: unknown): ClientEvent[] {
  const items = (raw as { events?: Record<string, unknown>[] })?.events ?? [];
  return items.map((e) => ({
    id: String(e.id),
    title: String(e.title),
    start: new Date(e.start as string),
    end: new Date(e.end as string),
    account: String(e.account),
    accountId: String(e.accountId),
    provider: e.provider as Provider,
    color: String(e.color),
    type: e.type as EventType,
    location: (e.location as string | null) ?? null,
    description: (e.description as string | null) ?? null,
  }));
}
