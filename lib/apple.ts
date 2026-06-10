import type { AppleRawEvent } from "./normalise";

/**
 * Minimal CalDAV REPORT query for VEVENTs in a date range. Apple Calendar has
 * no OAuth/REST API of its own — access is via CalDAV using app-specific
 * credentials, so this client speaks CalDAV directly over basic auth.
 */
export async function fetchAppleEvents(
  caldavUrl: string,
  username: string,
  appPassword: string,
  range: { start: Date; end: Date }
): Promise<AppleRawEvent[]> {
  const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag />
    <C:calendar-data />
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${formatICalDate(range.start)}" end="${formatICalDate(range.end)}" />
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  const res = await fetch(caldavUrl, {
    method: "REPORT",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "1",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CalDAV REPORT failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  return parseCalDavResponse(xml);
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Pulls VEVENT blocks out of the multistatus XML/iCal payload returned by CalDAV servers. */
function parseCalDavResponse(xml: string): AppleRawEvent[] {
  const events: AppleRawEvent[] = [];
  const veventBlocks = xml.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  for (const block of veventBlocks) {
    const uid = matchField(block, "UID");
    const summary = matchField(block, "SUMMARY");
    const start = matchField(block, "DTSTART");
    const end = matchField(block, "DTEND");
    const location = matchField(block, "LOCATION");
    const description = matchField(block, "DESCRIPTION");
    if (!uid) continue;

    events.push({
      uid,
      summary,
      start: start ? toIsoFromIcal(start) : undefined,
      end: end ? toIsoFromIcal(end) : undefined,
      location,
      description,
    });
  }

  return events;
}

function matchField(block: string, field: string): string | undefined {
  const match = block.match(new RegExp(`${field}(?:;[^:\\n]*)?:([^\\r\\n]+)`));
  return match?.[1]?.trim();
}

function toIsoFromIcal(value: string): string {
  const cleaned = value.replace("Z", "");
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return value;
  const [, y, mo, d, h = "00", mi = "00", s = "00"] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}
