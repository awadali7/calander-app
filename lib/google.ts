import type { GoogleRawEvent } from "./normalise";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export const GOOGLE_CALENDAR_SCOPES =
  "openid email profile https://www.googleapis.com/auth/calendar.readonly";

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

/** Builds the URL to send a user to Google's consent screen to link a calendar account. */
export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${OAUTH_AUTHORIZE_URL}?${params}`;
}

/** Exchanges an authorization code for access/refresh tokens. */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokens> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<GoogleTokens>;
}

/** Refreshes an expired Google access token using a stored refresh token. */
export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

/** Fetches the email/profile of the Google account behind an access token. */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google userinfo request failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<GoogleUserInfo>;
}

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
