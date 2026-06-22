import type { OutlookRawEvent } from "./normalise";

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const OAUTH_AUTHORIZE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const OAUTH_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export const MICROSOFT_CALENDAR_SCOPES = "openid email profile offline_access Calendars.Read";

export type MicrosoftTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export type MicrosoftUserInfo = {
  id: string;
  mail?: string;
  userPrincipalName: string;
  displayName?: string;
};

/** Builds the URL to send a user to Microsoft's consent screen to link a calendar account. */
export function getMicrosoftAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: MICROSOFT_CALENDAR_SCOPES,
    response_mode: "query",
    prompt: "consent",
    state,
  });
  return `${OAUTH_AUTHORIZE_URL}?${params}`;
}

/** Exchanges an authorization code for access/refresh tokens. */
export async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<MicrosoftTokens> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: MICROSOFT_CALENDAR_SCOPES,
    }),
  });

  if (!res.ok) {
    throw new Error(`Microsoft token exchange failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<MicrosoftTokens>;
}

/** Refreshes an expired Microsoft access token using a stored refresh token. */
export async function refreshMicrosoftAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      scope: MICROSOFT_CALENDAR_SCOPES,
    }),
  });

  if (!res.ok) {
    throw new Error(`Microsoft token refresh failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<{ access_token: string; expires_in: number; refresh_token?: string }>;
}

/** Fetches the email/profile of the Microsoft account behind an access token. */
export async function fetchMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const res = await fetch(`${GRAPH_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Microsoft userinfo request failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<MicrosoftUserInfo>;
}

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
