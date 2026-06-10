"use client";

import { useState } from "react";
import type { ClientAccount, ClientEvent } from "@/lib/calendar-types";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AddEventModal({
  accounts,
  defaultDate,
  initialEvent,
  onClose,
  onSave,
}: {
  accounts: ClientAccount[];
  defaultDate: Date;
  initialEvent?: ClientEvent | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    title: string;
    start: string;
    end: string;
    accountId: string;
    type: ClientEvent["type"];
    location?: string;
  }) => Promise<void>;
}) {
  const start = initialEvent?.start ?? new Date(defaultDate.setHours(9, 0, 0, 0));
  const end = initialEvent?.end ?? new Date(start.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [startValue, setStartValue] = useState(toLocalInputValue(start));
  const [endValue, setEndValue] = useState(toLocalInputValue(end));
  const [accountId, setAccountId] = useState(initialEvent?.accountId ?? accounts[0]?.id ?? "");
  const [type, setType] = useState<ClientEvent["type"]>(initialEvent?.type ?? "meeting");
  const [location, setLocation] = useState(initialEvent?.location ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Give the event a title.");
      return;
    }
    if (!accountId) {
      setError("Choose which calendar to add this to.");
      return;
    }
    if (new Date(endValue) <= new Date(startValue)) {
      setError("End time must be after the start time.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: initialEvent?.id,
        title: title.trim(),
        start: new Date(startValue).toISOString(),
        end: new Date(endValue).toISOString(),
        accountId,
        type,
        location: location.trim() || undefined,
      });
      onClose();
    } catch {
      setError("Couldn't save the event. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-card bg-card border border-border p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{initialEvent ? "Edit event" : "New event"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full text-foreground/40 hover:bg-background hover:text-foreground transition"
          >
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-input border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Team sync"
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Starts
            <input
              type="datetime-local"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              className="rounded-input border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Ends
            <input
              type="datetime-local"
              value={endValue}
              onChange={(e) => setEndValue(e.target.value)}
              className="rounded-input border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Calendar
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-input border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email} · {a.provider}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ClientEvent["type"])}
              className="rounded-input border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="meeting">Meeting</option>
              <option value="video">Video call</option>
              <option value="personal">Personal</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-input border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Optional"
            />
          </label>
        </div>

        {error && <p className="text-xs text-conflict">{error}</p>}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill border border-border text-sm font-medium px-4 py-2 hover:bg-background transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || accounts.length === 0}
            className="rounded-pill bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition disabled:opacity-40"
          >
            {saving ? "Saving…" : initialEvent ? "Save changes" : "Create event"}
          </button>
        </div>
        {accounts.length === 0 && (
          <p className="text-xs text-foreground/40">Connect a calendar account before adding events.</p>
        )}
      </form>
    </div>
  );
}
