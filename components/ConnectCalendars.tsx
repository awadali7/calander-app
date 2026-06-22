"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Provider = "gmail" | "outlook" | "apple";

type ConnectedAccount = {
  id: string;
  provider: Provider;
  email: string;
  color: string;
  label: string | null;
  eventCount: number;
};

const PROVIDERS: {
  id: Provider;
  name: string;
  description: string;
  color: string;
  limit: number;
  initials: string;
}[] = [
  {
    id: "gmail",
    name: "Google Calendar",
    description: "Sync events from your Gmail / Google Workspace calendars.",
    color: "#2563EB",
    limit: 5,
    initials: "G",
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    description: "Sync events from Microsoft 365 and Outlook.com calendars.",
    color: "#7C3AED",
    limit: 5,
    initials: "O",
  },
  {
    id: "apple",
    name: "Apple Calendar",
    description: "Sync events from iCloud Calendar via CalDAV.",
    color: "#059669",
    limit: 1,
    initials: "A",
  },
];

const AVATAR_COLORS = ["#2563EB", "#7C3AED", "#059669", "#F59E0B", "#EC4899", "#0EA5E9"];

export function ConnectCalendars({ context = "connect" }: { context?: "connect" | "settings" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    const connected = searchParams.get("connected");
    if (oauthError) setError(oauthError);
    if (connected === "gmail") setNotice("Google account connected.");
    if (connected === "outlook") setNotice("Outlook account connected.");
    if (oauthError || connected) {
      router.replace(context === "settings" ? "/settings" : "/connect");
    }
  }, [searchParams, router, context]);

  function connectOAuth(provider: "gmail" | "outlook") {
    const returnTo = context === "settings" ? "/settings" : "/connect";
    const path = provider === "gmail" ? "google" : "microsoft";
    window.location.href = `/api/accounts/${path}/connect?returnTo=${returnTo}`;
  }

  async function loadAccounts() {
    setLoading(true);
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts);
    }
    setLoading(false);
  }

  async function connect(provider: Provider) {
    setError(null);
    const trimmed = emailDraft.trim();
    if (!trimmed) {
      setError("Enter the email address for the account you want to connect.");
      return;
    }

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, email: trimmed }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't connect that account.");
      return;
    }

    setEmailDraft("");
    setPendingProvider(null);
    await loadAccounts();
  }

  async function disconnect(id: string) {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await loadAccounts();
  }

  const totalEvents = useMemo(() => accounts.reduce((sum, a) => sum + a.eventCount, 0), [accounts]);
  const connectedProviderCount = useMemo(
    () => new Set(accounts.map((a) => a.provider)).size,
    [accounts]
  );

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-input px-4 py-2">
          {notice}
        </p>
      )}
      {error && !pendingProvider && (
        <p className="text-sm text-conflict bg-red-50 border border-red-200 rounded-input px-4 py-2">
          {error}
        </p>
      )}
      {accounts.length > 0 && (
        <div className="rounded-card bg-card border border-border p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {accounts.map((a, i) => (
                  <div
                    key={a.id}
                    title={a.email}
                    className="w-9 h-9 rounded-full border-2 border-card flex items-center justify-center text-white text-xs font-semibold"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {a.email[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold leading-tight">
                  {accounts.length} account{accounts.length === 1 ? "" : "s"} connected
                </p>
                <p className="text-sm text-foreground/50">
                  {totalEvents} event{totalEvents === 1 ? "" : "s"} synced
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <div className="flex items-center justify-between text-xs text-foreground/50">
                <span>Providers connected</span>
                <span>{connectedProviderCount} / 3</span>
              </div>
              <div className="h-2 rounded-pill bg-background overflow-hidden">
                <div
                  className="h-full rounded-pill bg-primary transition-all"
                  style={{ width: `${(connectedProviderCount / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {PROVIDERS.map((provider) => {
          const providerAccounts = accounts.filter((a) => a.provider === provider.id);
          const atLimit = providerAccounts.length >= provider.limit;

          return (
            <div key={provider.id} className="rounded-card bg-card border border-border p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-card flex items-center justify-center text-white font-semibold"
                    style={{ background: provider.color }}
                  >
                    {provider.initials}
                  </div>
                  <div>
                    <p className="font-semibold">{provider.name}</p>
                    <p className="text-sm text-foreground/50">{provider.description}</p>
                  </div>
                </div>
                {providerAccounts.length === 0 && (
                  <button
                    onClick={() => {
                      if (provider.id === "gmail" || provider.id === "outlook") {
                        connectOAuth(provider.id);
                        return;
                      }
                      setPendingProvider(provider.id);
                      setError(null);
                    }}
                    className="rounded-pill bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition whitespace-nowrap"
                  >
                    Connect
                  </button>
                )}
              </div>

              {providerAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-3 rounded-input border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-sm font-medium">{account.email}</p>
                      <p className="text-xs text-foreground/50">
                        {account.eventCount} event{account.eventCount === 1 ? "" : "s"} synced
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnect(account.id)}
                    aria-label={`Disconnect ${account.email}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-foreground/40 hover:text-conflict hover:bg-red-50 transition"
                  >
                    ×
                  </button>
                </div>
              ))}

              {pendingProvider === provider.id && provider.id === "apple" && (
                <div className="flex flex-col gap-2 rounded-input border border-dashed border-border p-4">
                  <p className="text-sm text-foreground/60">
                    Sign in with {provider.name} to authorize read-only access (this demo accepts the
                    account email directly in place of the OAuth popup).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 rounded-input border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={() => connect(provider.id)}
                      className="rounded-input bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition"
                    >
                      Authorize
                    </button>
                    <button
                      onClick={() => {
                        setPendingProvider(null);
                        setError(null);
                        setEmailDraft("");
                      }}
                      className="rounded-input border border-border text-sm px-4 py-2 hover:bg-background transition"
                    >
                      Cancel
                    </button>
                  </div>
                  {error && <p className="text-xs text-conflict">{error}</p>}
                </div>
              )}

              {providerAccounts.length > 0 && !atLimit && pendingProvider !== provider.id && (
                <button
                  onClick={() => {
                    if (provider.id === "gmail" || provider.id === "outlook") {
                      connectOAuth(provider.id);
                      return;
                    }
                    setPendingProvider(provider.id);
                    setError(null);
                  }}
                  className="rounded-input border border-dashed border-border text-sm text-foreground/50 px-4 py-3 hover:border-primary hover:text-primary transition"
                >
                  + Add another account
                </button>
              )}

              {atLimit && (
                <p className="text-xs text-foreground/40">
                  Maximum of {provider.limit} {provider.name} account{provider.limit === 1 ? "" : "s"} reached.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-foreground/40 text-center">Read-only access only — UniCal never modifies your source calendars.</p>

      {context === "connect" && (
        <button
          disabled={accounts.length === 0 || loading}
          onClick={() => router.push("/calendar")}
          className="rounded-pill bg-primary text-white font-medium py-3 px-6 transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Open my calendar →
        </button>
      )}
    </div>
  );
}
