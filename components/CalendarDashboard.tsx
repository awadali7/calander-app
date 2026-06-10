"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { ConflictBanner } from "@/components/ConflictBanner";
import { EventDetail } from "@/components/EventDetail";
import { AddEventModal } from "@/components/AddEventModal";
import { detectConflictPairs, detectConflicts } from "@/lib/conflicts";
import { parseEvents, type ClientAccount, type ClientEvent } from "@/lib/calendar-types";

function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function CalendarDashboard() {
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [enabledAccountIds, setEnabledAccountIds] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<ClientEvent | null>(null);
  const [dismissedConflictKey, setDismissedConflictKey] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; event?: ClientEvent } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [accountsRes, eventsRes] = await Promise.all([fetch("/api/accounts"), fetch("/api/events")]);
    if (accountsRes.ok) {
      const data = await accountsRes.json();
      const fetched: ClientAccount[] = data.accounts;
      setAccounts(fetched);
      setEnabledAccountIds((prev) => (prev.size ? prev : new Set(fetched.map((a) => a.id))));
    }
    if (eventsRes.ok) {
      const data = await eventsRes.json();
      setEvents(parseEvents(data));
    }
    setLoading(false);
  }

  const visibleEvents = useMemo(
    () => events.filter((e) => enabledAccountIds.has(e.accountId)),
    [events, enabledAccountIds]
  );

  const conflictIds = useMemo(() => detectConflicts(visibleEvents), [visibleEvents]);
  const conflictPairs = useMemo(() => detectConflictPairs(visibleEvents), [visibleEvents]);

  const activePair = useMemo(() => {
    for (const pair of conflictPairs) {
      const key = `${pair.a.id}:${pair.b.id}`;
      if (key !== dismissedConflictKey) return { pair, key };
    }
    return null;
  }, [conflictPairs, dismissedConflictKey]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return visibleEvents
      .filter((e) => e.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 4);
  }, [visibleEvents]);

  const monday = startOfWeek(selectedDate);
  const friday = addDays(monday, 4);

  function toggleAccount(id: string) {
    setEnabledAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveEvent(data: {
    id?: string;
    title: string;
    start: string;
    end: string;
    accountId: string;
    type: ClientEvent["type"];
    location?: string;
  }) {
    if (data.id) {
      const res = await fetch(`/api/events/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("update failed");
    } else {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("create failed");
    }
    await load();
  }

  async function handleRemoveEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setSelectedEvent(null);
    await load();
  }

  async function handleRemoveLater() {
    if (!activePair) return;
    const { a, b } = activePair.pair;
    const later = a.start > b.start ? a : b;
    await handleRemoveEvent(later.id);
    setDismissedConflictKey(null);
  }

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar
        accounts={accounts}
        enabledAccountIds={enabledAccountIds}
        onToggleAccount={toggleAccount}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        upcoming={upcoming}
        onNewEvent={() => setModal({ mode: "create" })}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                {selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h1>
              <p className="text-xs text-foreground/40">
                Week of {monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {friday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                aria-label="Previous week"
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-background transition"
              >
                ‹
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="rounded-pill border border-border text-sm font-medium px-3 py-1.5 hover:bg-background transition"
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                aria-label="Next week"
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-background transition"
              >
                ›
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {conflictIds.size > 0 && (
              <span className="rounded-pill bg-red-50 text-conflict text-xs font-semibold px-3 py-1.5">
                ⚠ {conflictIds.size} conflict{conflictIds.size === 1 ? "" : "s"}
              </span>
            )}
            <button
              onClick={() => setModal({ mode: "create" })}
              className="rounded-pill bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition"
            >
              + Event
            </button>
          </div>
        </header>

        {activePair && (
          <ConflictBanner
            pair={activePair.pair}
            onDismiss={() => setDismissedConflictKey(activePair.key)}
            onRemoveLater={handleRemoveLater}
          />
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-foreground/40">Loading your calendar…</div>
        ) : accounts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <p className="font-medium">No calendars connected yet</p>
            <p className="text-sm text-foreground/50">Connect a Gmail, Outlook or Apple account to see your events here.</p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            <CalendarGrid
              selectedDate={selectedDate}
              events={visibleEvents}
              conflictIds={conflictIds}
              selectedEventId={selectedEvent?.id ?? null}
              onSelectEvent={setSelectedEvent}
            />
            {selectedEvent && (
              <EventDetail
                event={selectedEvent}
                isConflicting={conflictIds.has(selectedEvent.id)}
                onClose={() => setSelectedEvent(null)}
                onEdit={() => setModal({ mode: "edit", event: selectedEvent })}
                onRemove={() => handleRemoveEvent(selectedEvent.id)}
              />
            )}
          </div>
        )}
      </div>

      {modal && (
        <AddEventModal
          accounts={accounts}
          defaultDate={selectedDate}
          initialEvent={modal.mode === "edit" ? modal.event : null}
          onClose={() => setModal(null)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
