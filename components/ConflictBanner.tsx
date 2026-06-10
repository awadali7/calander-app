"use client";

import type { ClientEvent } from "@/lib/calendar-types";

function formatRange(a: ClientEvent, b: ClientEvent): string {
  const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmt(a.start)}–${fmt(a.end > b.end ? a.end : b.end)}`;
}

export function ConflictBanner({
  pair,
  onDismiss,
  onRemoveLater,
}: {
  pair: { a: ClientEvent; b: ClientEvent };
  onDismiss: () => void;
  onRemoveLater: () => void;
}) {
  const { a, b } = pair;
  const later = a.start > b.start ? a : b;
  const earlier = later === a ? b : a;

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 border-b border-warning/30 px-6 py-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-warning text-base shrink-0" aria-hidden>
          ⚠
        </span>
        <p className="truncate">
          <span className="font-medium">&ldquo;{earlier.title}&rdquo;</span>
          <span className="text-foreground/50"> ({earlier.account}) overlaps with </span>
          <span className="font-medium">&ldquo;{later.title}&rdquo;</span>
          <span className="text-foreground/50"> ({later.account}) — {formatRange(a, b)}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRemoveLater}
          className="rounded-pill bg-conflict text-white text-xs font-medium px-3 py-1.5 hover:bg-red-600 transition"
        >
          Remove later event
        </button>
        <button
          onClick={onDismiss}
          className="rounded-pill border border-warning/40 text-xs font-medium px-3 py-1.5 hover:bg-amber-100 transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
