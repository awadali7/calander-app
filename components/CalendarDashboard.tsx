"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, startOfWeek } from "date-fns";
import { Sidebar } from "@/components/Sidebar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { MonthGrid } from "@/components/MonthGrid";
import { SearchBox } from "@/components/SearchBox";
import { ConflictBanner } from "@/components/ConflictBanner";
import { EventDetail } from "@/components/EventDetail";
import { AddEventModal } from "@/components/AddEventModal";
import { detectConflictPairs, detectConflicts } from "@/lib/conflicts";
import { parseEvents, type ClientAccount, type ClientEvent } from "@/lib/calendar-types";

type View = "day" | "week" | "month";

function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function CalendarDashboard() {
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [enabledAccountIds, setEnabledAccountIds] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<View>("week");
  const [selectedEvent, setSelectedEvent] = useState<ClientEvent | null>(null);
  const [dismissedConflictKey, setDismissedConflictKey] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; event?: ClientEvent } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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

  const gridStartDate = view === "day" ? selectedDate : weekStart(selectedDate);
  const gridDayCount = view === "day" ? 1 : 7;
  const weekEnd = addDays(weekStart(selectedDate), 6);

  function stepDate(direction: 1 | -1) {
    setSelectedDate((current) => {
      if (view === "day") return addDays(current, direction);
      if (view === "month") return addMonths(current, direction);
      return addWeeks(current, direction);
    });
  }

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

  async function handleRescheduleEvent(id: string, start: Date, end: Date) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, start, end } : e)));
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: start.toISOString(), end: end.toISOString() }),
    });
    if (!res.ok) await load();
  }

  async function handleRemoveEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setSelectedEvent(null);
    await load();
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      await load();
    } finally {
      setSyncing(false);
    }
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
        onSelectUpcoming={(event) => {
          setSelectedDate(event.start);
          setSelectedEvent(event);
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                {view === "month"
                  ? selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                  : view === "day"
                  ? selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                  : selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h1>
              <p className="text-xs text-foreground/40">
                {view === "week" &&
                  `Week of ${weekStart(selectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => stepDate(-1)}
                aria-label="Previous"
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
                onClick={() => stepDate(1)}
                aria-label="Next"
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-background transition"
              >
                ›
              </button>
            </div>
            <div className="flex items-center rounded-pill border border-border p-0.5 text-sm">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-pill px-3 py-1 font-medium capitalize transition ${
                    view === v ? "bg-primary text-white" : "hover:bg-background"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SearchBox
              events={visibleEvents}
              onSelect={(event) => {
                setSelectedDate(event.start);
                setSelectedEvent(event);
                if (view === "month") setView("day");
              }}
            />
            {conflictIds.size > 0 && (
              <span className="rounded-pill bg-red-50 text-conflict text-xs font-semibold px-3 py-1.5">
                ⚠ {conflictIds.size} conflict{conflictIds.size === 1 ? "" : "s"}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-pill border border-border text-sm font-medium px-4 py-2 hover:bg-background transition disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync"}
            </button>
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
            {view === "month" ? (
              <MonthGrid
                monthDate={selectedDate}
                events={visibleEvents}
                conflictIds={conflictIds}
                onSelectDay={(date) => {
                  setSelectedDate(date);
                  setView("day");
                }}
                onSelectEvent={setSelectedEvent}
              />
            ) : (
              <CalendarGrid
                startDate={gridStartDate}
                dayCount={gridDayCount}
                events={visibleEvents}
                conflictIds={conflictIds}
                selectedEventId={selectedEvent?.id ?? null}
                onSelectEvent={setSelectedEvent}
                onRescheduleEvent={handleRescheduleEvent}
              />
            )}
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
