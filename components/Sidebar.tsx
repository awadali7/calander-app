"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/Logo";
import { MiniCalendar } from "@/components/MiniCalendar";
import { AccountToggle } from "@/components/AccountToggle";
import type { ClientAccount, ClientEvent } from "@/lib/calendar-types";

export function Sidebar({
  accounts,
  enabledAccountIds,
  onToggleAccount,
  selectedDate,
  onSelectDate,
  upcoming,
  onNewEvent,
  onSelectUpcoming,
}: {
  accounts: ClientAccount[];
  enabledAccountIds: Set<string>;
  onToggleAccount: (id: string) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  upcoming: ClientEvent[];
  onNewEvent: () => void;
  onSelectUpcoming: (event: ClientEvent) => void;
}) {
  return (
    <aside className="w-[220px] shrink-0 border-r border-border bg-card flex flex-col gap-5 p-4 overflow-y-auto max-md:hidden">
      <div className="flex items-center gap-2">
        <Logo size={32} />
        <span className="font-semibold">UniCal</span>
      </div>

      <button
        onClick={onNewEvent}
        className="rounded-pill bg-primary text-white text-sm font-medium py-2.5 hover:bg-blue-700 transition"
      >
        + New event
      </button>

      <MiniCalendar selected={selectedDate} onSelect={onSelectDate} />

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40 px-1">Accounts</p>
        {accounts.length === 0 && (
          <p className="text-xs text-foreground/40 px-1">No accounts connected yet.</p>
        )}
        {accounts.map((account) => (
          <AccountToggle
            key={account.id}
            account={account}
            enabled={enabledAccountIds.has(account.id)}
            onToggle={() => onToggleAccount(account.id)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40 px-1">Upcoming reminders</p>
        {upcoming.length === 0 && <p className="text-xs text-foreground/40 px-1">Nothing coming up.</p>}
        {upcoming.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelectUpcoming(event)}
            className="flex items-center gap-2 px-1 py-1 text-sm text-left rounded-input hover:bg-background transition"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: event.color }} />
            <div className="min-w-0">
              <p className="truncate leading-tight">{event.title}</p>
              <p className="text-xs text-foreground/40 leading-tight">
                {event.start.toLocaleString(undefined, {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground px-1 py-2 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground px-1 py-2 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
