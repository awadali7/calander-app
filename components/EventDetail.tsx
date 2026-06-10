"use client";

import type { ClientEvent } from "@/lib/calendar-types";

const TYPE_LABELS: Record<ClientEvent["type"], string> = {
  video: "Video call",
  meeting: "Meeting",
  personal: "Personal",
};

export function EventDetail({
  event,
  isConflicting,
  onClose,
  onEdit,
  onRemove,
}: {
  event: ClientEvent;
  isConflicting: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const fmtDate = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <aside className="w-[240px] shrink-0 border-l border-border bg-card flex flex-col gap-4 p-4 overflow-y-auto max-lg:hidden">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold leading-tight">{event.title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-foreground/40 hover:bg-background hover:text-foreground transition"
        >
          ×
        </button>
      </div>

      <div className="text-sm text-foreground/70">
        <p>{fmtDate(event.start)}</p>
        <p>
          {fmtTime(event.start)} – {fmtTime(event.end)}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: event.color }} />
        <span className="truncate">{event.account}</span>
      </div>

      <div className="text-sm">
        <span className="inline-block rounded-pill bg-background border border-border px-3 py-1 text-xs font-medium">
          {TYPE_LABELS[event.type]}
        </span>
      </div>

      {event.location && <p className="text-sm text-foreground/60">📍 {event.location}</p>}
      {event.description && <p className="text-sm text-foreground/60">{event.description}</p>}

      {isConflicting && (
        <div className="rounded-input bg-amber-50 border border-warning/30 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
          <span aria-hidden>⚠</span>
          This event overlaps with another event on your calendar.
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={onEdit}
          className="rounded-pill border border-border text-sm font-medium py-2 hover:bg-background transition"
        >
          Edit event
        </button>
        <button
          onClick={onRemove}
          className="rounded-pill bg-conflict text-white text-sm font-medium py-2 hover:bg-red-600 transition"
        >
          Remove event
        </button>
      </div>
    </aside>
  );
}
